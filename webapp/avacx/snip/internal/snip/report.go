package snip

import "time"

// Report captures the outcome of a scan operation.
type Report struct {
	Findings []Finding
	Stats    ScanStats
	Errors   []ScanError
}

// ScanStats aggregates metrics from a run.
type ScanStats struct {
	FilesAnalyzed int
	FilesSkipped  int
	Duration      time.Duration
}

// ScanError records files that could not be processed.
type ScanError struct {
	Path   string
	Reason string
}
