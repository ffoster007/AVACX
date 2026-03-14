package snip

import (
	"context"
	"regexp"
	"strconv"
	"strings"

	"avacx/internal/snip/analysis"
	"avacx/internal/snip/severity"
)

type detector interface {
	ID() string
	Detect(ctx context.Context, engine *severity.Engine, result analysis.Result) []Finding
}

type detectionRule struct {
	id             string
	title          string
	description    string
	category       FindingCategory
	subCategory    string
	tags           []string
	cwe            []string
	owasp          []string
	references     []string
	pattern        *regexp.Regexp
	languages      map[Language]bool
	exploitability float64
	businessImpact float64
	vector         severity.Vector
	matcher        func(line analysis.LineInfo, res analysis.Result) (bool, string)
}

type ruleDetector struct {
	id    string
	rules []detectionRule
}

const (
	// lineMergeGap captures how far apart matched lines can be while still being grouped as a single finding.
	lineMergeGap = 1
	// locationBacktrackLines widens the StartLine upward to account for off-by-few-line detector noise.
	locationBacktrackLines = 2
)

func (r ruleDetector) ID() string {
	return r.id
}

func (r ruleDetector) Detect(ctx context.Context, engine *severity.Engine, result analysis.Result) []Finding {
	lang := ParseLanguage(result.Artifact.Language)
	if lang == LanguageUnknown {
		lang = InferLanguageFromPath(result.Artifact.Path)
	}

	seen := map[string]struct{}{}
	findings := make([]Finding, 0, len(result.Lines))

	for _, rule := range r.rules {
		if len(rule.languages) > 0 && !rule.languages[lang] {
			continue
		}

		matches := make([]detectionMatch, 0)

		for _, line := range result.Lines {
			if err := ctx.Err(); err != nil {
				return findings
			}

			matched := false
			snippet := strings.TrimSpace(line.Content)

			if rule.matcher != nil {
				var override string
				matched, override = rule.matcher(line, result)
				if override != "" {
					snippet = override
				}
			} else if rule.pattern != nil {
				matched = rule.pattern.MatchString(line.Content)
			}

			if !matched {
				continue
			}

			key := rule.id + "::" + result.Artifact.Path + "::" + strconv.Itoa(line.Number)
			if _, exists := seen[key]; exists {
				continue
			}
			seen[key] = struct{}{}

			if snippet == "" {
				snippet = strings.TrimSpace(line.Trimmed)
			}
			if snippet == "" {
				snippet = line.Content
			}

			matches = append(matches, detectionMatch{line: line.Number, snippet: snippet})
		}

		if len(matches) == 0 {
			continue
		}

		groups := groupDetectionMatches(matches, len(result.Lines))
		for _, group := range groups {
			score := engine.Compute(severity.ScoreInput{
				Vector:           rule.vector,
				Exploitability:   rule.exploitability,
				BusinessImpact:   rule.businessImpact,
				AssetCriticality: 0,
			})

			finding := Finding{
				ID:          rule.id,
				Title:       rule.title,
				Description: rule.description,
				Category:    rule.category,
				SubCategory: rule.subCategory,
				Tags:        append([]string{}, rule.tags...),
				CWE:         append([]string{}, rule.cwe...),
				OWASP:       append([]string{}, rule.owasp...),
				References:  append([]string{}, rule.references...),
				Snippet:     truncateSnippet(group.snippet),
				Location:    Location{Path: result.Artifact.Path, StartLine: group.startLine, EndLine: group.endLine},
				DetectorID:  r.id,
				Severity:    score,
				Evidence: map[string]string{
					"pattern": patternSummary(rule.pattern),
				},
			}
			findings = append(findings, finding)
		}
	}

	return findings
}

type detectionMatch struct {
	line    int
	snippet string
}

type detectionGroup struct {
	startLine int
	endLine   int
	snippet   string
}

type detectionGroupBuilder struct {
	rawStart int
	rawEnd   int
	snippets []string
}

func newDetectionGroupBuilder(match detectionMatch) detectionGroupBuilder {
	return detectionGroupBuilder{
		rawStart: match.line,
		rawEnd:   match.line,
		snippets: []string{match.snippet},
	}
}

func (b detectionGroupBuilder) finalize(totalLines int) detectionGroup {
	start := b.rawStart
	if b.rawStart == b.rawEnd {
		start -= locationBacktrackLines
		if start < 1 {
			start = 1
		}
	}
	end := b.rawEnd
	if end > totalLines {
		end = totalLines
	}

	snippet := combineSnippets(b.snippets)
	if snippet == "" && len(b.snippets) > 0 {
		fallback := strings.TrimSpace(b.snippets[0])
		if fallback == "" {
			fallback = b.snippets[0]
		}
		snippet = fallback
	}

	return detectionGroup{startLine: start, endLine: end, snippet: snippet}
}

func groupDetectionMatches(matches []detectionMatch, totalLines int) []detectionGroup {
	if len(matches) == 0 {
		return nil
	}

	groups := make([]detectionGroup, 0)
	current := newDetectionGroupBuilder(matches[0])
	lastLine := matches[0].line

	for i := 1; i < len(matches); i++ {
		m := matches[i]
		if m.line <= lastLine+lineMergeGap {
			if m.line > current.rawEnd {
				current.rawEnd = m.line
			}
			current.snippets = append(current.snippets, m.snippet)
			lastLine = m.line
			continue
		}

		groups = append(groups, current.finalize(totalLines))
		current = newDetectionGroupBuilder(m)
		lastLine = m.line
	}

	groups = append(groups, current.finalize(totalLines))
	return groups
}

func combineSnippets(snippets []string) string {
	if len(snippets) == 0 {
		return ""
	}

	ordered := make([]string, 0, len(snippets))
	seen := map[string]struct{}{}

	for _, snippet := range snippets {
		trimmed := strings.TrimSpace(snippet)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		ordered = append(ordered, trimmed)
	}

	if len(ordered) == 0 {
		return ""
	}

	return strings.Join(ordered, "\n")
}

func patternSummary(p *regexp.Regexp) string {
	if p == nil {
		return "custom-matcher"
	}
	return p.String()
}

func truncateSnippet(snippet string) string {
	if len(snippet) <= 320 {
		return snippet
	}
	return snippet[:317] + "..."
}

func buildDetectors() []detector {
	return []detector{
		ruleDetector{id: "vulnerability", rules: vulnerabilityRules()},
		ruleDetector{id: "attack_patterns", rules: attackPatternRules()},
		ruleDetector{id: "malicious_code", rules: maliciousCodeRules()},
	}
}

func languagesSet(langs ...Language) map[Language]bool {
	set := make(map[Language]bool, len(langs))
	for _, lang := range langs {
		set[lang] = true
	}
	return set
}
