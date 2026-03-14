package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"avacx/internal/snip"
)

func main() {
	var (
		pathFlag      = flag.String("path", ".", "path to scan recursively")
		maxFindings   = flag.Int("max-findings", 200, "maximum number of findings to emit")
		languagesFlag = flag.String("languages", "", "comma separated list of languages to enable (optional)")
		timeoutFlag   = flag.Duration("timeout", 2*time.Minute, "overall scan timeout")
	)
	flag.Parse()

	options := []snip.Option{snip.WithMaxFindings(*maxFindings)}
	if *languagesFlag != "" {
		langs := strings.Split(*languagesFlag, ",")
		for _, lang := range langs {
			options = append(options, snip.WithLanguage(snip.ParseLanguage(lang)))
		}
	}

	fmt.Fprintf(os.Stderr, "[snip] starting scan at %s\n", time.Now().Format(time.RFC3339))
	fmt.Fprintf(os.Stderr, "[snip] target path: %s\n", *pathFlag)

	scanner, err := snip.NewScanner(options...)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to initialise scanner: %v\n", err)
		os.Exit(1)
	}

	files, err := gatherFiles(*pathFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to enumerate files: %v\n", err)
		os.Exit(1)
	}
	fmt.Fprintf(os.Stderr, "[snip] discovered %d file(s) for analysis\n", len(files))

	ctx, cancel := context.WithTimeout(context.Background(), *timeoutFlag)
	defer cancel()

	start := time.Now()
	report, scanErr := scanner.Scan(ctx, files)
	elapsed := time.Since(start)
	if scanErr != nil {
		fmt.Fprintf(os.Stderr, "scan completed with errors: %v\n", scanErr)
	}
	fmt.Fprintf(os.Stderr, "[snip] scan completed in %s with %d finding(s)\n", elapsed.Truncate(time.Millisecond), len(report.Findings))

	payload, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to marshal report: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(payload))
}

func gatherFiles(root string) ([]snip.CodeFile, error) {
	info, err := os.Stat(root)
	if err != nil {
		return nil, err
	}

	var paths []string
	if info.IsDir() {
		err = filepath.WalkDir(root, func(path string, d os.DirEntry, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			if d.IsDir() {
				if shouldSkipDir(d.Name()) {
					return filepath.SkipDir
				}
				return nil
			}
			if shouldSkipFile(path) {
				return nil
			}
			paths = append(paths, path)
			return nil
		})
	} else {
		paths = []string{root}
	}

	if err != nil {
		return nil, err
	}

	files := make([]snip.CodeFile, 0, len(paths))
	for _, path := range paths {
		content, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", path, err)
		}
		lang := snip.InferLanguageFromPath(path)
		files = append(files, snip.CodeFile{Path: path, Language: lang, Content: content})
	}

	return files, nil
}

func shouldSkipDir(name string) bool {
	skip := map[string]struct{}{
		".git":         {},
		"node_modules": {},
		"vendor":       {},
		".next":        {},
		"dist":         {},
		"build":        {},
		"target":       {},
	}
	_, ok := skip[name]
	return ok
}

func shouldSkipFile(path string) bool {
	if strings.HasSuffix(path, ".min.js") {
		return true
	}
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.Size() > 1<<20 // skip files larger than 1MB
}
