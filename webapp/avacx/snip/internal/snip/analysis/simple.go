package analysis

import (
	"bufio"
	"bytes"
	"context"
	"regexp"
	"sort"
	"strings"
)

type simpleAnalyzer struct {
	tokenPattern      *regexp.Regexp
	stringPattern     *regexp.Regexp
	callPattern       *regexp.Regexp
	assignmentPattern *regexp.Regexp
}

// NewDefaultAnalyzer returns a lightweight analyzer that powers the detector heuristics.
func NewDefaultAnalyzer() Analyzer {
	return &simpleAnalyzer{
		tokenPattern:      regexp.MustCompile(`(?i)[a-z_][a-z0-9_\.]*`),
		stringPattern:     regexp.MustCompile(`(?s)("([^"\\]|\\.)*"|'([^'\\]|\\.)*')`),
		callPattern:       regexp.MustCompile(`(?i)([a-z_][a-z0-9_\.\-]*)\s*\(`),
		assignmentPattern: regexp.MustCompile(`(?i)([a-z_][a-z0-9_\.\->]*)\s*(?:=|:=)\s*([^;]+)`),
	}
}

func (a *simpleAnalyzer) Analyze(ctx context.Context, artifact Artifact) (Result, error) {
	result := Result{Artifact: artifact}
	scanner := bufio.NewScanner(bytes.NewReader(artifact.Content))
	scanner.Buffer(make([]byte, 0, 64*1024), 2*1024*1024)

	tokenSet := map[string]struct{}{}
	identifierSet := map[string]struct{}{}
	literalSet := map[string]struct{}{}
	keywords := commonKeywords(artifact.Language)

	lineNo := 0
	for scanner.Scan() {
		if err := ctx.Err(); err != nil {
			return Result{}, err
		}

		lineNo++
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)
		result.Lines = append(result.Lines, LineInfo{Number: lineNo, Content: line, Trimmed: trimmed})

		for _, token := range a.tokenPattern.FindAllString(line, -1) {
			if token == "" {
				continue
			}
			tokenLower := strings.ToLower(token)
			tokenSet[tokenLower] = struct{}{}
			if _, isKeyword := keywords[tokenLower]; !isKeyword {
				identifierSet[tokenLower] = struct{}{}
			}
		}

		for _, literal := range a.stringPattern.FindAllString(line, -1) {
			if literal != "" {
				literalSet[literal] = struct{}{}
			}
		}

		for _, match := range a.callPattern.FindAllStringSubmatch(line, -1) {
			if len(match) < 2 {
				continue
			}
			result.Calls = append(result.Calls, CallSite{Name: match[1], Line: lineNo})
		}

		for _, match := range a.assignmentPattern.FindAllStringSubmatch(line, -1) {
			if len(match) < 3 {
				continue
			}
			target := strings.TrimSpace(match[1])
			value := strings.TrimSpace(match[2])
			result.Assignments = append(result.Assignments, Assignment{Target: target, Line: lineNo, Value: value})
		}

		if importEntry := tryParseImport(trimmed); importEntry != nil {
			importEntry.Line = lineNo
			result.Imports = append(result.Imports, *importEntry)
		}
	}

	result.Tokens = toSortedSlice(tokenSet)
	result.Identifiers = toSortedSlice(identifierSet)
	result.Literals = toSortedSlice(literalSet)

	return result, scanner.Err()
}

func toSortedSlice(set map[string]struct{}) []string {
	if len(set) == 0 {
		return nil
	}
	out := make([]string, 0, len(set))
	for value := range set {
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}

func commonKeywords(language string) map[string]struct{} {
	keywords := []string{
		"if", "else", "for", "while", "switch", "case", "func", "function",
		"class", "struct", "package", "import", "return", "var", "let", "const",
		"try", "catch", "finally", "break", "continue", "def", "end", "do", "done",
	}
	set := map[string]struct{}{}
	for _, keyword := range keywords {
		set[keyword] = struct{}{}
	}
	lowerLang := strings.ToLower(language)
	switch lowerLang {
	case "sql", "nosql", "postgresql", "mysql", "mssql", "sqlite":
		extensions := []string{"select", "insert", "update", "delete", "from", "where", "group", "by"}
		for _, ext := range extensions {
			set[ext] = struct{}{}
		}
	}
	return set
}

func tryParseImport(line string) *ImportEntry {
	lower := strings.ToLower(line)
	switch {
	case strings.HasPrefix(lower, "import "):
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			alias := ""
			path := parts[len(parts)-1]
			path = strings.Trim(path, "\"'")
			if len(parts) == 4 && strings.EqualFold(parts[1], "as") {
				alias = parts[2]
			}
			return &ImportEntry{Alias: alias, Path: path}
		}
	case strings.HasPrefix(lower, "from "):
		parts := strings.Fields(line)
		if len(parts) >= 4 && strings.EqualFold(parts[2], "import") {
			return &ImportEntry{Alias: parts[3], Path: strings.Trim(parts[1], "\"'")}
		}
	case strings.Contains(lower, "require("):
		start := strings.Index(line, "require(") + len("require(")
		end := strings.Index(line[start:], ")")
		if end > 0 {
			module := strings.Trim(line[start:start+end], " \"'")
			return &ImportEntry{Path: module}
		}
	case strings.HasPrefix(lower, "#include"):
		path := strings.TrimSpace(strings.TrimPrefix(line, "#include"))
		return &ImportEntry{Path: strings.Trim(path, "<>\"")}
	}
	return nil
}
