package analysis

import "context"

// Artifact represents the minimal data required to inspect a source unit.
type Artifact struct {
	Path     string
	Language string
	Content  []byte
}

// Result bundles intermediate data extracted from a source artifact.
type Result struct {
	Artifact    Artifact
	Lines       []LineInfo
	Tokens      []string
	Identifiers []string
	Literals    []string
	Imports     []ImportEntry
	Calls       []CallSite
	Assignments []Assignment
}

// LineInfo captures meta information about a single source line.
type LineInfo struct {
	Number  int
	Content string
	Trimmed string
}

// ImportEntry notes discovered import/include statements.
type ImportEntry struct {
	Alias string
	Path  string
	Line  int
}

// CallSite tracks function or method invocations.
type CallSite struct {
	Name string
	Line int
}

// Assignment represents a symbol assignment encountered while scanning.
type Assignment struct {
	Target string
	Line   int
	Value  string
}

// Analyzer consumes code artifacts and produces analysis results.
type Analyzer interface {
	Analyze(ctx context.Context, artifact Artifact) (Result, error)
}
