package snip

import (
	"context"
	"errors"
	"fmt"
	"time"

	"avacx/internal/snip/analysis"
	"avacx/internal/snip/severity"
)

// Scanner coordinates analysis, detection, and scoring.
type Scanner struct {
	config    Config
	analyzer  analysis.Analyzer
	detectors []detector
	engine    *severity.Engine
}

// NewScanner builds a scanner with optional configuration overrides.
func NewScanner(opts ...Option) (*Scanner, error) {
	cfg := DefaultConfig()
	for _, opt := range opts {
		opt(&cfg)
	}

	analyzer := analysis.NewDefaultAnalyzer()
	engine := severity.NewEngine(cfg.BusinessImpact, cfg.AssetCriticality)

	s := &Scanner{
		config:    cfg,
		analyzer:  analyzer,
		detectors: buildDetectors(),
		engine:    engine,
	}
	return s, nil
}

// Scan executes the Snip pipeline over the provided code files.
func (s *Scanner) Scan(ctx context.Context, files []CodeFile) (Report, error) {
	if len(files) == 0 {
		return Report{Stats: ScanStats{}}, nil
	}

	start := time.Now()
	findings := make([]Finding, 0)
	errors := make([]ScanError, 0)
	allowedLanguages := s.config.EnabledLanguages

	dedup := map[string]struct{}{}
	filesAnalyzed := 0
	filesSkipped := 0

	for _, file := range files {
		if err := ctx.Err(); err != nil {
			return Report{}, err
		}

		lang := file.Language
		if lang == LanguageUnknown {
			lang = InferLanguageFromPath(file.Path)
		}

		if len(allowedLanguages) > 0 && !allowedLanguages[lang] {
			filesSkipped++
			continue
		}

		artifact := analysis.Artifact{
			Path:     file.Path,
			Language: string(lang),
			Content:  append([]byte(nil), file.Content...),
		}

		result, err := s.analyzer.Analyze(ctx, artifact)
		if err != nil {
			errors = append(errors, ScanError{Path: file.Path, Reason: fmt.Sprintf("analysis failed: %v", err)})
			continue
		}

		filesAnalyzed++

		for _, detector := range s.detectors {
			partial := detector.Detect(ctx, s.engine, result)
			for _, finding := range partial {
				key := dedupKey(finding)
				if _, seen := dedup[key]; seen {
					continue
				}
				dedup[key] = struct{}{}
				findings = append(findings, finding)

				if s.config.MaxFindings > 0 && len(findings) >= s.config.MaxFindings {
					stats := ScanStats{FilesAnalyzed: filesAnalyzed, FilesSkipped: filesSkipped, Duration: time.Since(start)}
					return Report{Findings: findings, Stats: stats, Errors: errors}, errorsOrNil(errors)
				}
			}
		}
	}

	report := Report{
		Findings: findings,
		Stats: ScanStats{
			FilesAnalyzed: filesAnalyzed,
			FilesSkipped:  filesSkipped,
			Duration:      time.Since(start),
		},
		Errors: errors,
	}

	return report, errorsOrNil(errors)
}

func dedupKey(f Finding) string {
	return fmt.Sprintf("%s|%s|%d-%d|%s", f.ID, f.Location.Path, f.Location.StartLine, f.Location.EndLine, f.Snippet)
}

func errorsOrNil(errs []ScanError) error {
	if len(errs) == 0 {
		return nil
	}
	return errors.New("one or more files failed to scan")
}
