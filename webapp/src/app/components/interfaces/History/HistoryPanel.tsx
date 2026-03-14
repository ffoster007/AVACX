"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, History, RefreshCcw, X, Folder, Save, Loader2, Trash2 } from "lucide-react";

import { SnipHistoryEntry } from "@/app/types/SnipPriority.types";
import { DeleteSnipRunDialog } from "@/app/components/popup/ConfirmDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceOptions: Array<{ id: string; name: string; type: "local" | "github" }>;
  snipPaths: Record<string, string>;
  onSavePath: (input: {
    workspaceId: string;
    workspaceName: string;
    workspaceType: "local" | "github";
    path: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  onRefreshPaths: () => Promise<{ ok: boolean; message?: string }>;
  defaultWorkspaceId?: string | null;
  onHistorySync?: (entries: SnipHistoryEntry[]) => void;
}

const SnipControlPanel: React.FC<Props> = ({
  open,
  onClose,
  workspaceOptions,
  snipPaths,
  onSavePath,
  onRefreshPaths,
  defaultWorkspaceId,
  onHistorySync,
}) => {
  const [history, setHistory] = useState<SnipHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pathWorkspaceId, setPathWorkspaceId] = useState<string>("");
  const [pathValue, setPathValue] = useState<string>("");
  const [pathStatus, setPathStatus] = useState<{ state: "idle" | "saving" | "success" | "error"; message?: string }>({
    state: "idle",
    message: undefined,
  });
  const [refreshingPaths, setRefreshingPaths] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SnipHistoryEntry | null>(null);
  const [splitPct, setSplitPct] = useState<number>(50); // left pane width percentage
  const resizingRef = useRef<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => history.find((entry) => entry.id === selectedId) ?? history[0] ?? null, [history, selectedId]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/snip/history");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load history");
      }
      const entries = Array.isArray(payload?.history) ? (payload.history as SnipHistoryEntry[]) : [];
      setHistory(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadHistory();
  }, [open, loadHistory]);

  const ensureWorkspaceSelection = useCallback(() => {
    if (!open) return;
    if (workspaceOptions.length === 0) {
      setPathWorkspaceId("");
      setPathValue("");
      return;
    }
    setPathWorkspaceId((previous) => {
      if (defaultWorkspaceId && workspaceOptions.some((workspace) => workspace.id === defaultWorkspaceId)) {
        return defaultWorkspaceId;
      }
      if (previous && workspaceOptions.some((workspace) => workspace.id === previous)) {
        return previous;
      }
      return workspaceOptions[0]?.id ?? "";
    });
  }, [defaultWorkspaceId, open, workspaceOptions]);

  useEffect(() => {
    ensureWorkspaceSelection();
  }, [ensureWorkspaceSelection]);

  useEffect(() => {
    if (!open) {
      setPathStatus({ state: "idle", message: undefined });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!pathWorkspaceId) {
      setPathValue("");
      return;
    }
    setPathValue(snipPaths[pathWorkspaceId] ?? "");
  }, [open, pathWorkspaceId, snipPaths]);

  useEffect(() => {
    if (!open) return;
    if (history.length === 0) {
      setSelectedId(null);
    } else if (!selectedId) {
      setSelectedId(history[0].id);
    }
  }, [history, open, selectedId]);

  useEffect(() => {
    if (!open || !onHistorySync) return;
    // Defer parent history sync to avoid cross-render state updates.
    onHistorySync(history);
  }, [history, onHistorySync, open]);

  const handleDownload = (entry: SnipHistoryEntry | null) => {
    if (!entry) return;
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `snip-report-${entry.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteEntry = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/snip/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error((payload && payload.error) || "Failed to delete entry.");
      }
        setHistory((prev) => {
          const updated = prev.filter((entry) => entry.id !== deleteTarget.id);
          if (deleteTarget.id === selectedId) {
            setSelectedId(updated[0]?.id ?? null);
          }
          return updated;
        });
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry.");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, selectedId]);

  const handlePathSave = useCallback(async () => {
    if (!pathWorkspaceId) {
      setPathStatus({ state: "error", message: "Select a workspace to save a path." });
      return;
    }
    const trimmed = pathValue.trim();
    if (!trimmed) {
      setPathStatus({ state: "error", message: "Provide the absolute path for this workspace." });
      return;
    }

    const workspaceMeta = workspaceOptions.find((workspace) => workspace.id === pathWorkspaceId);
    if (!workspaceMeta) {
      setPathStatus({ state: "error", message: "Unknown workspace selection." });
      return;
    }

    setPathStatus({ state: "saving" });
    try {
      const result = await onSavePath({
        workspaceId: workspaceMeta.id,
        workspaceName: workspaceMeta.name,
        workspaceType: workspaceMeta.type,
        path: trimmed,
      });

      if (result.ok) {
        setPathValue(trimmed);
        setPathStatus({ state: "success", message: result.message ?? "Saved workspace path." });
      } else {
        setPathStatus({ state: "error", message: result.message ?? "Failed to save workspace path." });
      }
    } catch (error) {
      setPathStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Failed to save workspace path.",
      });
    }
  }, [onSavePath, pathValue, pathWorkspaceId, workspaceOptions]);

  const handleRefreshPaths = useCallback(async () => {
    setRefreshingPaths(true);
    try {
      const result = await onRefreshPaths();
      if (result.ok) {
        setPathStatus({ state: "success", message: result.message ?? "Workspace paths refreshed." });
      } else {
        setPathStatus({ state: "error", message: result.message ?? "Unable to refresh workspace paths." });
      }
    } finally {
      setRefreshingPaths(false);
    }
  }, [onRefreshPaths]);

  // Handle splitter drag to resize panes
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const rect = splitContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      let pct = (x / rect.width) * 100;
      // Clamp between 25% and 75% to avoid extreme layouts
      pct = Math.max(25, Math.min(75, pct));
      setSplitPct(pct);
    };
    const onUp = () => {
      resizingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-x-hidden">
      <div className="flex w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-lg border border-[#2d2d31] bg-[#101013] shadow-2xl">
        <aside className="w-64 border-r border-[#242428] bg-[#151518] text-sm text-gray-200 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#232326] px-4 py-3 text-xs uppercase tracking-wide text-gray-400">
            <span className="flex items-center gap-2">
              <History size={14} /> History
            </span>
            <button
              type="button"
              onClick={() => {
                void loadHistory();
                void handleRefreshPaths();
              }}
              className="rounded border border-[#343438] bg-[#1b1b1d] p-1 text-gray-400 hover:text-white"
            >
              <RefreshCcw size={14} className={loading || refreshingPaths ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {loading ? (
              <div className="px-4 py-4 text-xs text-gray-400">Loading...</div>
            ) : history.length === 0 ? (
              <div className="px-4 py-4 text-xs text-gray-400">No Snip runs recorded yet.</div>
            ) : (
              <ul>
                {history.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={`w-full border-b border-[#202024] px-4 py-3 text-left text-xs hover:bg-[#1c1c1f] cursor-pointer ${
                        entry.id === selected?.id ? "bg-[#1f1f23]" : ""
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">{new Date(entry.triggeredAt).toLocaleString()}</p>
                      <p className="mt-1 text-gray-200">{entry.path}</p>
                      <p className="mt-1 text-[11px] text-gray-500">Source: {entry.source}</p>
                      <p className="mt-1 text-[11px] text-gray-500">Findings: {entry.report.Findings.length}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <main className="flex-1 text-sm text-gray-200 flex flex-col min-h-0">
          <header className="flex items-center justify-between border-b border-[#232326] px-5 py-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-gray-400">Snip session</span>
              <strong className="text-sm text-white">{selected ? new Date(selected.triggeredAt).toLocaleString() : "Select a session"}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (selected ? setDeleteTarget(selected) : null)}
                className="inline-flex items-center gap-2 rounded border border-[#3a2a2b] bg-[#201517] px-3 py-1.5 text-xs text-[#fda4af] hover:text-white disabled:opacity-60 cursor-pointer"
                disabled={!selected || deleting}
                title="Delete this Snip run"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
              <button
                type="button"
                onClick={() => handleDownload(selected ?? null)}
                className="inline-flex items-center gap-2 rounded border border-[#313135] bg-[#1a1a1d] px-3 py-1.5 text-xs text-gray-300 hover:text-white cursor-pointer"
                disabled={!selected}
              >
                <Download size={14} /> Download details
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-[#343438] bg-[#1b1b1d] p-2 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </header>
          <section className="border-b border-[#232326] bg-[#131316] px-5 py-4 text-xs text-gray-300">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
              <Folder size={12} /> Workspace paths
            </div>
            {workspaceOptions.length === 0 ? (
              <p className="mt-3 text-xs text-gray-500">
                Import or open a workspace to configure its Snip path.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr_auto]">
                <label className="flex flex-col gap-1 text-[11px] text-gray-400">
                  Workspace
                  <select
                    value={pathWorkspaceId}
                    onChange={(event) => {
                      setPathWorkspaceId(event.target.value);
                      setPathStatus({ state: "idle", message: undefined });
                    }}
                    className="rounded border border-[#2d2d31] bg-[#1a1a1d] px-2 py-1.5 text-xs text-gray-200 focus:border-[#3c89ff] focus:outline-none"
                  >
                    {workspaceOptions.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name} • {workspace.type === "local" ? "Local" : "GitHub"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-gray-400">
                  Absolute path on server
                  <input
                    type="text"
                    value={pathValue}
                    onChange={(event) => {
                      setPathValue(event.target.value);
                      setPathStatus({ state: "idle", message: undefined });
                    }}
                    placeholder="/srv/repos/workspace"
                    className="rounded border border-[#2d2d31] bg-[#1a1a1d] px-3 py-1.5 text-[12px] text-gray-200 focus:border-[#3c89ff] focus:outline-none"
                  />
                </label>
                <div className="flex flex-col justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handlePathSave()}
                    className="inline-flex items-center justify-center gap-2 rounded border border-[#313135] bg-[#1a1a1d] px-3 py-2 text-xs text-gray-200 hover:text-white disabled:opacity-60"
                    disabled={!pathWorkspaceId || pathStatus.state === "saving"}
                  >
                    {pathStatus.state === "saving" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save path
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRefreshPaths()}
                    className="inline-flex items-center justify-center gap-2 rounded border border-[#313135] bg-[#1a1a1d] px-3 py-2 text-xs text-gray-200 hover:text-white disabled:opacity-60"
                    disabled={refreshingPaths}
                  >
                    {refreshingPaths ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                    Refresh
                  </button>
                </div>
              </div>
            )}
            {pathStatus.message ? (
              <p
                className={`mt-2 text-[11px] ${
                  pathStatus.state === "error"
                    ? "text-[#fca5a5]"
                    : pathStatus.state === "success"
                    ? "text-[#8ff0a4]"
                    : "text-gray-500"
                }`}
              >
                {pathStatus.message}
              </p>
            ) : null}
          </section>
          <div ref={splitContainerRef} className="flex-1 min-h-0 flex select-none">
            <section
              className="flex flex-col border-r border-[#232326] px-5 py-4 overflow-y-auto overflow-x-hidden break-words"
              style={{ width: `${splitPct}%` }}
            >
              <h3 className="text-sm font-semibold text-white">Vulnerability summary</h3>
              {selected ? (
                <div className="mt-3 space-y-3 text-xs text-gray-300">
                  <p>
                    Analysed {selected.report.Stats.FilesAnalyzed} item{selected.report.Stats.FilesAnalyzed === 1 ? "" : "s"} in approximately {selected.report.Stats.Duration}. We recorded {selected.report.Findings.length} finding{selected.report.Findings.length === 1 ? "" : "s"} for review.
                  </p>
                  <div className="space-y-2">
                    {selected.report.Findings.map((finding) => (
                      <div
                        key={`${finding.ID}:${finding.Location.Path}:${finding.Location.StartLine}-${finding.Location.EndLine}`}
                        className="rounded border border-[#2c1f20] bg-[#1b1314] px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-white break-words">{finding.Title}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-[#fca5a5]">Priority {finding.Severity?.Priority ?? "unknown"}</p>
                        <p className="mt-2 leading-relaxed text-gray-300 break-words">{finding.Description}</p>
                        <p className="mt-2 text-[11px] text-gray-500 break-all">
                          Location: {finding.Location.Path} (
                          {finding.Location.StartLine === finding.Location.EndLine
                            ? `line ${finding.Location.StartLine}`
                            : `lines ${finding.Location.StartLine}-${finding.Location.EndLine}`}
                          )
                        </p>
                      </div>
                    ))}
                  </div>
                  {selected.report.Findings.length === 0 && (
                    <div className="rounded border border-[#1f3327] bg-[#132a1c] px-3 py-3 text-xs text-[#8ff0a4]">
                      No issues were flagged during this run.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-xs text-gray-400">Select a session to see details.</div>
              )}
            </section>
            <div
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize"
              onMouseDown={(e) => {
                e.preventDefault();
                resizingRef.current = true;
              }}
              onDoubleClick={() => setSplitPct(50)}
              className="w-1 cursor-col-resize bg-[#232326] hover:bg-[#2d2d31]"
            />
            <section
              className="flex flex-col px-5 py-4 overflow-y-auto overflow-x-hidden"
              style={{ width: `${100 - splitPct}%` }}
            >
              <h3 className="text-sm font-semibold text-white">Terminal output</h3>
              {selected ? (
                <pre className="mt-3 flex-1 overflow-y-auto overflow-x-hidden rounded border border-[#232326] bg-black px-3 py-3 font-mono text-[11px] text-[#b5f5ff] whitespace-pre-wrap">
                  {selected.terminalOutput || "No terminal output captured."}
                </pre>
              ) : (
                <div className="mt-3 text-xs text-gray-400">Select a session to view the console log.</div>
              )}
            </section>
          </div>
          {error ? (
            <div className="border-t border-[#232326] bg-[#1f1517] px-5 py-2 text-xs text-[#f9a8d4]">{error}</div>
          ) : null}
        </main>
      </div>
      <DeleteSnipRunDialog
        open={Boolean(deleteTarget)}
        loading={deleting}
        onConfirm={() => void handleDeleteEntry()}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};

export default SnipControlPanel;
