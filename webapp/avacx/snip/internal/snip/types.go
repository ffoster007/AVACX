package snip

import (
	"path/filepath"
	"strings"

	"avacx/internal/snip/severity"
)

// Language enumerates source languages supported by Snip.
type Language string

const (
	LanguageUnknown    Language = "unknown"
	LanguageJavaScript Language = "javascript"
	LanguageTypeScript Language = "typescript"
	LanguagePHP        Language = "php"
	LanguagePython     Language = "python"
	LanguageRuby       Language = "ruby"
	LanguageJava       Language = "java"
	LanguageSwift      Language = "swift"
	LanguageObjectiveC Language = "objective-c"
	LanguageKotlin     Language = "kotlin"
	LanguageSQL        Language = "sql"
	LanguageNoSQL      Language = "nosql"
	LanguageGo         Language = "go"
	LanguageShell      Language = "shell"
)

// ParseLanguage tries to infer a language value from an arbitrary string.
func ParseLanguage(input string) Language {
	lc := strings.ToLower(strings.TrimSpace(input))
	switch lc {
	case "js", "javascript":
		return LanguageJavaScript
	case "ts", "typescript":
		return LanguageTypeScript
	case "php":
		return LanguagePHP
	case "py", "python":
		return LanguagePython
	case "rb", "ruby":
		return LanguageRuby
	case "java":
		return LanguageJava
	case "swift":
		return LanguageSwift
	case "objc", "objective-c":
		return LanguageObjectiveC
	case "kt", "kotlin":
		return LanguageKotlin
	case "sql":
		return LanguageSQL
	case "nosql":
		return LanguageNoSQL
	case "go", "golang":
		return LanguageGo
	case "sh", "bash", "shell":
		return LanguageShell
	default:
		return LanguageUnknown
	}
}

// InferLanguageFromPath uses the file extension to select a language.
func InferLanguageFromPath(path string) Language {
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(path), "."))
	if ext == "" {
		return LanguageUnknown
	}
	return ParseLanguage(ext)
}

// CodeFile represents a source unit scheduled for analysis.
type CodeFile struct {
	Path     string
	Language Language
	Content  []byte
}

// Location pinpoints where in a file a finding was produced.
type Location struct {
	Path      string
	StartLine int
	EndLine   int
}

// FindingCategory classifies the families of issues the engine reports.
type FindingCategory string

const (
	CategoryVulnerability FindingCategory = "vulnerability"
	CategoryAttackPattern FindingCategory = "attack_pattern"
	CategoryMaliciousCode FindingCategory = "malicious_code"
)

// Finding is the normalized output for any detector hit.
type Finding struct {
	ID          string
	Title       string
	Description string
	Category    FindingCategory
	SubCategory string
	Tags        []string
	CWE         []string
	OWASP       []string
	References  []string
	Snippet     string
	Location    Location
	DetectorID  string
	Severity    severity.Score
	Evidence    map[string]string
}
