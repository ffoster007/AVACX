"use client";

import React, { useEffect, useRef, useState } from "react";
import { GitBranch, X, FileCode2, Loader2, AlertTriangle, Clock3 } from "lucide-react";

import { SnipHistoryEntry } from "@/app/types/SnipPriority.types";

export type TerminalItem =
  | { id: string; kind: "text"; text: string }
  | {
      id: string;
      kind: "snip";
      status: "idle" | "running" | "success" | "error";
      entry?: SnipHistoryEntry | null;
      workspaceName?: string | null;
      log?: string;
    };

type Props = {
  branch?: string;
  shell?: string;
  items: TerminalItem[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  onHide: () => void;
  onNewSession: () => void;
};

const Terminal: React.FC<Props> = ({
  branch = "main",
  shell = "bash",
  items,
  inputValue,
  onInputChange,
  onInputKeyDown,
  onResizeStart,
  onHide,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [rawOpen, setRawOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [items]);

  const renderSnipItem = (item: Extract<TerminalItem, { kind: "snip" }>) => {
    const { entry, status, log, workspaceName } = item;
    const findings = entry?.report?.Findings ?? [];
    const startedAt = entry?.triggeredAt ? new Date(entry.triggeredAt) : null;
    const running = status === "running" && !entry;
    const isRawOpen = !!rawOpen[item.id];

    if (running) {
      return (
        <div className="rounded border border-[#2b2b2e] bg-[#101013] px-3 py-3 text-xs text-gray-200 space-y-2">
          <div className="flex items-center gap-2 text-[#7dd3fc]">
            <Loader2 size={14} className="animate-spin" />
            <span className="font-semibold">Running Snip{workspaceName ? ` · ${workspaceName}` : ""}</span>
          </div>
          {log ? (
            <div className="mt-1">
              <div className="flex items-center justify-between border-b border-[#202023] py-1 text-[11px] uppercase tracking-wide text-gray-400">
                <span className="flex items-center gap-2"><Clock3 size={12} /> Terminal Output</span>
                <button
                  type="button"
                  className="text-[11px] text-gray-400 hover:text-white underline"
                  onClick={() => setRawOpen((prev) => ({ ...prev, [item.id]: !isRawOpen }))}
                >
                  {isRawOpen ? "Hide" : "Show"} raw
                </button>
              </div>
              {isRawOpen ? (
                <pre className="max-h-48 overflow-auto bg-black px-3 py-2 text-[11px] text-[#b5f5ff] whitespace-pre-wrap">{log}</pre>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    }

    if (!entry) {
      return null;
    }

    return (
      <div className="rounded border border-[#2b2b2e] bg-[#0f0f11] px-3 py-3 text-xs text-gray-200 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-white">
            <FileCode2 size={14} className="text-[#7dd3fc]" />
            <span className="font-semibold">Snip results</span>
            {workspaceName ? <span className="text-[11px] text-gray-400">{workspaceName}</span> : null}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className={status === "error" ? "text-[#fca5a5]" : status === "success" ? "text-[#a5f3c7]" : ""}>
              {status === "error" ? "Completed with issues" : "Completed"}
            </span>
            {startedAt ? <span>{startedAt.toLocaleString()}</span> : null}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 text-[11px] text-gray-300">
          <div className="rounded border border-[#252528] bg-[#141416] px-2 py-2">
            <p className="text-gray-500 uppercase tracking-wide">Path</p>
            <p className="text-white break-words text-sm leading-snug">{entry.path || "—"}</p>
          </div>
          <div className="rounded border border-[#252528] bg-[#141416] px-2 py-2">
            <p className="text-gray-500 uppercase tracking-wide">Findings</p>
            <p className="text-white text-sm">{findings.length}</p>
          </div>
          <div className="rounded border border-[#252528] bg-[#141416] px-2 py-2">
            <p className="text-gray-500 uppercase tracking-wide">Duration</p>
            <p className="text-white text-sm">{entry.durationMs ? `${entry.durationMs} ms` : "--"}</p>
          </div>
        </div>
        {findings.length === 0 ? (
          <div className="text-gray-400 text-sm">No findings were reported.</div>
        ) : (
          <div className="space-y-3">
            {findings.map((finding) => {
              const snippetLines = finding.Snippet ? finding.Snippet.split(/\r?\n/) : [];
              const startLine = finding.Location.StartLine;
              const endLine = finding.Location.EndLine;
              return (
                <div
                  key={`${finding.ID}-${finding.Location.Path}-${startLine}`}
                  className="rounded border border-[#26262a] bg-[#121214] px-3 py-3 space-y-2"
                >
                  <div className="flex items-center gap-2 text-white">
                    {status === "error" ? <AlertTriangle size={14} className="text-[#fca5a5]" /> : <FileCode2 size={14} className="text-[#a5f3c7]" />}
                    <span className="font-semibold break-words">{finding.Title}</span>
                    <span className="rounded bg-[#1f2933] px-2 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                      Priority {finding.Severity?.Priority ?? "?"}
                    </span>
                  </div>
                  <p className="text-gray-300 text-[12px] leading-relaxed break-words">{finding.Description}</p>
                  <div className="text-[11px] text-gray-400 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1">
                      <FileCode2 size={12} />
                      {finding.Location.Path}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 size={12} />
                      {startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}–${endLine}`}
                    </span>
                  </div>
                  {snippetLines.length > 0 ? (
                    <div className="overflow-hidden rounded border border-[#1f1f22] bg-[#0b0b0d]">
                      {snippetLines.map((line, index) => {
                        const lineNo = startLine + index;
                        const highlighted = lineNo >= startLine && lineNo <= endLine;
                        return (
                          <div
                            key={`${lineNo}-${index}`}
                            className={`flex gap-3 px-3 py-1 text-[11px] font-mono whitespace-pre-wrap leading-relaxed ${
                              highlighted ? "bg-[#21161a] text-[#fca5a5]" : "text-gray-200"
                            }`}
                          >
                            <span className="w-12 shrink-0 text-right text-[11px] text-gray-500">{lineNo}</span>
                            <code className="flex-1 break-words">{line || " "}</code>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {log ? (
          <div className="mt-1">
            <div className="flex items-center justify-between border-b border-[#202023] px-1 py-1 text-[11px] uppercase tracking-wide text-gray-400">
              <span className="flex items-center gap-2"><Clock3 size={12} /> Terminal Output</span>
              <button
                type="button"
                className="text-[11px] text-gray-400 hover:text-white underline"
                onClick={() => setRawOpen((prev) => ({ ...prev, [item.id]: !isRawOpen }))}
              >
                {isRawOpen ? "Hide" : "Show"} raw
              </button>
            </div>
            {isRawOpen ? (
              <pre className="max-h-64 overflow-auto bg-black px-3 py-3 text-[11px] text-[#b5f5ff] whitespace-pre-wrap">{log}</pre>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div onMouseDown={onResizeStart} className="h-2 flex items-center justify-center cursor-row-resize text-[#2c2c2f]">
        <div className="w-20 h-px bg-[#2d2d30]" />
      </div>
      <div className="h-9 border-b border-[#242425] flex items-center justify-between px-3 text-xs text-gray-400 select-none">
        <div className="flex items-center space-x-3">
          <span className="text-gray-200">Terminal</span>
          <span className="text-[11px] bg-[#26262a] px-2 py-0.5 rounded">{shell}</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-[11px] text-gray-500">
            <GitBranch size={14} className="text-[#6aa0ff]" />
            <span>{branch}</span>
          </div>
          <button
            type="button"
            className="p-1 rounded hover:bg-[#27272a] text-gray-400 hover:text-white cursor-pointer"
            title="Hide terminal"
            onClick={onHide}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto font-mono text-[11px] px-3 py-3 space-y-2 text-gray-200">
        {items.map((item) =>
          item.kind === "text" ? (
            <div key={item.id} className="whitespace-pre-wrap text-gray-200">
              {item.text}
            </div>
          ) : (
            <div key={item.id}>{renderSnipItem(item)}</div>
          )
        )}
      </div>
      <div className="border-t border-[#242425] px-3 py-2">
        <div className="flex items-center text-sm text-gray-300">
          <span className="text-[#4FC3F7] mr-2">$</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Type a command and press Enter"
            className="flex-1 bg-transparent outline-none placeholder:text-gray-500"
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
