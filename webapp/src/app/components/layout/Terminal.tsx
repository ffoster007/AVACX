"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileCode2, Loader2, NotebookText, X } from "lucide-react";

import { SnipHistoryEntry } from "@/app/types/SnipPriority.types";

interface Props {
  open: boolean;
  onClose: () => void;
  status: "idle" | "running" | "success" | "error";
  entry: SnipHistoryEntry | null;
  log?: string;
  workspaceName?: string | null;
}

const STATUS_LABEL: Record<Props["status"], string> = {
  idle: "Ready",
  running: "Running Snip...",
  success: "Completed",
  error: "Completed with issues",
};

const STATUS_COLOR: Record<Props["status"], string> = {
  idle: "text-gray-400",
  running: "text-[#7dd3fc]",
  success: "text-[#a5f3c7]",
  error: "text-[#fca5a5]",
};

function formatDuration(ms?: number) {
  if (!ms || Number.isNaN(ms)) return "--";
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem.toFixed(0)}s`;
}

const SnipTerminal: React.FC<Props> = ({ open, onClose, status, entry, log, workspaceName }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [entry, open]);

  const findings = useMemo(() => entry?.report?.Findings ?? [], [entry]);
  const startedAt = useMemo(() => (entry?.triggeredAt ? new Date(entry.triggeredAt) : null), [entry]);

  if (!open) return null;

  const snippetFor = (snippet?: string, startLine?: number, endLine?: number) => {
    const lines = snippet ? snippet.split(/\r?\n/) : [];
    if (lines.length === 0) {
      return <p className="text-xs text-gray-500">Snippet not available.</p>;
    }

    const start = Number.isFinite(startLine) ? startLine ?? 0 : 0;
    const end = Number.isFinite(endLine) ? endLine ?? start : start;

    return (
      <div className="mt-2 overflow-hidden rounded border border-[#262628] bg-[#0d0d0f]">
        {lines.map((line, index) => {
          const lineNo = start + index;
          const highlighted = lineNo >= start && lineNo <= end;
          return (
            <div
              key={`${lineNo}-${index}`}
              className={`flex gap-3 px-3 py-1 text-xs font-mono whitespace-pre-wrap leading-relaxed ${
                highlighted ? "bg-[#21161a] text-[#fca5a5]" : "text-gray-200"
              }`}
            >
              <span className="w-12 shrink-0 text-right text-[11px] text-gray-500">{lineNo || index + 1}</span>
              <code className="flex-1 break-words">{line || " "}</code>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-5xl rounded-lg border border-[#2b2b2e] bg-[#0d0d0f] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#202023] px-4 py-3 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <NotebookText size={16} className="text-[#7dd3fc]" />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-white">Snip Results</span>
              <span className="text-[11px] uppercase tracking-wide text-gray-500">{workspaceName ?? "Workspace"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            <span className={`${STATUS_COLOR[status]} font-medium`}>{STATUS_LABEL[status]}</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#323236] bg-[#151518] p-1 text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </header>

        <div className="max-h-[75vh] overflow-auto px-4 py-4" ref={containerRef}>
          {status === "running" ? (
            <div className="flex items-center gap-3 rounded border border-[#2a2a2e] bg-[#121214] px-4 py-3 text-sm text-gray-200">
              <Loader2 className="animate-spin text-[#7dd3fc]" size={16} />
              Running Snip... we will show findings and code context here.
            </div>
          ) : entry ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded border border-[#262628] bg-[#141416] px-3 py-3 text-sm text-gray-300">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Path</p>
                  <p className="mt-1 break-words text-white">{entry.path || "—"}</p>
                </div>
                <div className="rounded border border-[#262628] bg-[#141416] px-3 py-3 text-sm text-gray-300">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Triggered</p>
                  <p className="mt-1 text-white">{startedAt ? startedAt.toLocaleString() : "—"}</p>
                </div>
                <div className="rounded border border-[#262628] bg-[#141416] px-3 py-3 text-sm text-gray-300">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Duration</p>
                  <p className="mt-1 text-white">{formatDuration(entry.durationMs)}</p>
                </div>
                <div className="rounded border border-[#262628] bg-[#141416] px-3 py-3 text-sm text-gray-300">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Findings</p>
                  <p className="mt-1 text-white">{findings.length}</p>
                </div>
              </div>

              <div className="rounded border border-[#252528] bg-[#111113]">
                <div className="flex items-center justify-between border-b border-[#202023] px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                  <span className="flex items-center gap-2"><FileCode2 size={14} /> Highlights</span>
                  <span className="text-[11px] text-gray-500">{findings.length} item{findings.length === 1 ? "" : "s"}</span>
                </div>
                {findings.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-400">No findings were reported for this run.</div>
                ) : (
                  <div className="divide-y divide-[#1c1c1f]">
                    {findings.map((finding) => (
                      <div key={`${finding.ID}-${finding.Location.Path}-${finding.Location.StartLine}`} className="px-4 py-3 text-sm text-gray-200 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-white">
                          {status === "error" ? <AlertTriangle size={15} className="text-[#fca5a5]" /> : <CheckCircle2 size={15} className="text-[#a5f3c7]" />}
                          <span className="font-semibold break-words">{finding.Title}</span>
                          <span className="rounded bg-[#1f2933] px-2 py-1 text-[11px] uppercase tracking-wide text-gray-300">Priority {finding.Severity?.Priority ?? "?"}</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed break-words">{finding.Description}</p>
                        <div className="text-[11px] text-gray-400 flex flex-wrap gap-3">
                          <span className="flex items-center gap-1"><FileCode2 size={12} />{finding.Location.Path}</span>
                          <span className="flex items-center gap-1"><Clock3 size={12} />
                            {finding.Location.StartLine === finding.Location.EndLine
                              ? `Line ${finding.Location.StartLine}`
                              : `Lines ${finding.Location.StartLine}–${finding.Location.EndLine}`}
                          </span>
                        </div>
                        {snippetFor(finding.Snippet, finding.Location.StartLine, finding.Location.EndLine)}
                        {finding.Tags?.length ? (
                          <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                            {finding.Tags.map((tag) => (
                              <span key={tag} className="rounded border border-[#2b2b2f] bg-[#151518] px-2 py-1">{tag}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded border border-[#252528] bg-[#111113]">
                <div className="flex items-center justify-between border-b border-[#202023] px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                  <span className="flex items-center gap-2"><Clock3 size={14} /> Terminal Output</span>
                  <button
                    type="button"
                    onClick={() => setShowRaw((prev) => !prev)}
                    className="text-[11px] text-gray-400 hover:text-white underline"
                  >
                    {showRaw ? "Hide" : "Show"} raw
                  </button>
                </div>
                {showRaw ? (
                  <pre className="max-h-64 overflow-auto bg-black px-4 py-3 text-xs text-[#b5f5ff] whitespace-pre-wrap">
                    {entry.terminalOutput || log || "No console output was produced."}
                  </pre>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-300">
                    {entry.terminalOutput ? entry.terminalOutput.split(/\r?\n/).slice(-4).map((line, idx) => (
                      <div key={`${idx}-${line}`} className="text-[12px] text-[#b5f5ff] font-mono leading-relaxed">{line}</div>
                    )) : <span className="text-gray-500">No console output was produced.</span>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded border border-[#2a2a2e] bg-[#121214] px-4 py-3 text-sm text-gray-300">
              {log || "Awaiting Snip output..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnipTerminal;
