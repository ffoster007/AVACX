export type SnipPriority = "P0" | "P1" | "P2" | "P3" | "P4" | string;

export interface SnipSeverityScore {
  Vector: Record<string, unknown>;
  CVSS: number;
  Exploitability: number;
  BusinessImpact: number;
  AssetCriticality: number;
  RiskScore: number;
  Priority: SnipPriority;
}

export interface SnipFinding {
  ID: string;
  Title: string;
  Description: string;
  Category: string;
  SubCategory: string;
  Tags: string[];
  CWE: string[];
  OWASP: string[];
  References: string[];
  Snippet?: string;
  Location: {
    Path: string;
    StartLine: number;
    EndLine: number;
  };
  DetectorID?: string;
  Evidence?: Record<string, string>;
  Severity: SnipSeverityScore;
}

export interface SnipReport {
  Findings: SnipFinding[];
  Stats: {
    FilesAnalyzed: number;
    FilesSkipped: number;
    Duration: string;
  };
  Errors: Array<{
    Path: string;
    Reason: string;
  }>;
}

export interface SnipScanResponse {
  success: boolean;
  report: SnipReport;
  terminalOutput: string;
  historyId: string;
  durationMs: number;
}

export interface SnipHistoryEntry {
  id: string;
  workspaceId?: string | null;
  source: string;
  triggeredAt: string;
  durationMs: number;
  path: string;
  report: SnipReport;
  terminalOutput: string;
}
