import type { Prisma } from "@/generated/prisma/client";

import { db } from "@/app/lib/db";

export interface SnipSeverityScore {
  Vector: Record<string, unknown>;
  CVSS: number;
  Exploitability: number;
  BusinessImpact: number;
  AssetCriticality: number;
  RiskScore: number;
  Priority: string;
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
  Snippet: string;
  Location: {
    Path: string;
    StartLine: number;
    EndLine: number;
  };
  DetectorID: string;
  Severity: SnipSeverityScore;
  Evidence: Record<string, string>;
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

export interface SnipHistoryEntry {
  id: string;
  userId?: number;
  workspaceId?: string | null;
  source: "workspace" | "overview" | string;
  triggeredAt: string;
  durationMs: number;
  path: string;
  report: SnipReport;
  terminalOutput: string;
}

const MAX_HISTORY_ENTRIES = 50;
const TERMINAL_OUTPUT_LIMIT = 8000;

function mapRecord(record: {
  id: string;
  userId: number;
  workspaceId: string | null;
  source: string;
  triggeredAt: Date;
  durationMs: number;
  path: string;
  report: Prisma.JsonValue;
  terminalOutput: string;
}): SnipHistoryEntry {
  return {
    id: record.id,
    userId: record.userId,
    workspaceId: record.workspaceId,
    source: record.source,
    triggeredAt: record.triggeredAt.toISOString(),
    durationMs: record.durationMs,
    path: record.path,
    report: record.report as unknown as SnipReport,
    terminalOutput: record.terminalOutput,
  };
}

export async function readHistory(userId: number): Promise<SnipHistoryEntry[]> {
  const records = await db.snipHistoryEntry.findMany({
    where: { userId },
    orderBy: { triggeredAt: "desc" },
    take: MAX_HISTORY_ENTRIES,
  });

  return records.map(mapRecord);
}

export async function appendHistory(userId: number, entry: SnipHistoryEntry): Promise<void> {
  const terminalOutput = entry.terminalOutput.slice(-TERMINAL_OUTPUT_LIMIT);
  const triggeredAt = new Date(entry.triggeredAt);
  const validTriggeredAt = Number.isNaN(triggeredAt.getTime()) ? new Date() : triggeredAt;

  await db.$transaction(async (tx) => {
    await tx.snipHistoryEntry.create({
      data: {
        id: entry.id,
        userId,
        workspaceId: entry.workspaceId ?? null,
        source: entry.source,
        triggeredAt: validTriggeredAt,
        durationMs: entry.durationMs,
        path: entry.path,
        report: entry.report as unknown as Prisma.InputJsonValue,
        terminalOutput,
      },
    });

    const excess = await tx.snipHistoryEntry.findMany({
      where: { userId },
      orderBy: { triggeredAt: "desc" },
      skip: MAX_HISTORY_ENTRIES,
      select: { id: true },
    });

    if (excess.length > 0) {
      await tx.snipHistoryEntry.deleteMany({
        where: { id: { in: excess.map((record) => record.id) } },
      });
    }
  });
}

export async function deleteHistoryEntry(userId: number, id: string): Promise<boolean> {
  try {
    await db.snipHistoryEntry.delete({
      where: { id, userId },
    });
    return true;
  } catch {
    // If not found or not owned by user, Prisma throws. Normalize to false
    return false;
  }
}
