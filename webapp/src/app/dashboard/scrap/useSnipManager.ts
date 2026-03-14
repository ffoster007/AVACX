import { useCallback, useEffect, useState } from "react";
import { isBrowser, loadStoredSnipPaths, persistSnipPaths } from "../../lib/utils";
import { useSnipHistory } from "../../hooks/useSnipHistory";
import { SnipHistoryEntry, SnipReport } from "../../types/SnipPriority.types";
import { WorkspaceEntry } from "../../types/gitwork.types";

type SnipManagerOptions = {
  status: "loading" | "authenticated" | "unauthenticated";
  selectedWorkspaceId: string | null;
  setIsTerminalOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setTerminalSuppressed: (suppressed: boolean) => void;
};

export const useSnipManager = ({
  status,
  selectedWorkspaceId,
  setIsTerminalOpen,
  setTerminalSuppressed,
}: SnipManagerOptions) => {
  const [snipTerminalStatus, setSnipTerminalStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [snipTerminalLog, setSnipTerminalLog] = useState("");
  const [snipReport, setSnipReport] = useState<SnipReport | null>(null);
  const [snipVulnerOpen, setSnipVulnerOpen] = useState(false);
  const [snipWorkspaceRunning, setSnipWorkspaceRunning] = useState<string | null>(null);
  const [controlOpen, setControlOpen] = useState(false);
  const [controlWorkspaceId, setControlWorkspaceId] = useState<string | null>(null);
  const [snipPaths, setSnipPaths] = useState<Record<string, string>>({});

  const { snipHistoryByWorkspace, snipResultEntry, setSnipResultEntry, handleHistorySync, upsertHistoryEntry } =
    useSnipHistory(status);

  useEffect(() => {
    if (!isBrowser()) return;
    setSnipPaths(loadStoredSnipPaths());
  }, []);

  const fetchSnipPaths = useCallback(async () => {
    try {
      const response = await fetch("/api/snip/paths", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : "Failed to load Snip paths.";
        throw new Error(message);
      }
      const entries = Array.isArray(payload?.paths) ? (payload.paths as Array<Record<string, unknown>>) : [];
      const fetched = entries.reduce<Record<string, string>>((accumulator, entry) => {
        const workspaceId = typeof entry.workspaceId === "string" ? entry.workspaceId : null;
        const workspacePath = typeof entry.path === "string" ? entry.path : null;
        if (workspaceId && workspacePath) {
          accumulator[workspaceId] = workspacePath;
        }
        return accumulator;
      }, {});
      setSnipPaths((previous) => ({ ...previous, ...fetched }));
      return { ok: true as const, message: "Workspace paths refreshed." };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load Snip paths.";
      console.warn("[dashboard] fetchSnipPaths error", message);
      return { ok: false as const, message };
    }
  }, []);

  const handleSaveSnipPath = useCallback(
    async ({
      workspaceId,
      workspaceName,
      workspaceType,
      path,
    }: {
      workspaceId: string;
      workspaceName: string;
      workspaceType: "local" | "github";
      path: string;
    }) => {
      try {
        const response = await fetch("/api/snip/paths", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, workspaceName, workspaceType, path }),
        });
        const payload = await response.json();
        if (!response.ok) {
          const message = typeof payload?.error === "string" ? payload.error : "Failed to save Snip path.";
          return { ok: false as const, message };
        }
        const savedPath = typeof payload?.path?.path === "string" ? payload.path.path : path;
        setSnipPaths((previous) => ({ ...previous, [workspaceId]: savedPath }));
        return { ok: true as const, message: "Workspace path saved." };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save Snip path.";
        return { ok: false as const, message };
      }
    },
    []
  );

  useEffect(() => {
    persistSnipPaths(snipPaths);
  }, [snipPaths]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetchSnipPaths();
  }, [status, fetchSnipPaths]);

  useEffect(() => {
    if (!controlOpen || status !== "authenticated") return;
    void fetchSnipPaths();
  }, [controlOpen, status, fetchSnipPaths]);

  const resolveSnipPath = useCallback(
    (workspace: WorkspaceEntry): string | null => {
      const configured = snipPaths[workspace.id];

      if (workspace.type === "local") {
        if (workspace.metadata.absolutePath) {
          return workspace.metadata.absolutePath;
        }
        if (configured) {
          return configured;
        }

        setIsTerminalOpen(true);
        setSnipTerminalStatus("error");
        setSnipTerminalLog(
          `[snip] No server path configured for ${workspace.name}. Open Snip Control from the Activity Bar to add a path before running scans.`
        );
        setSnipResultEntry(null);
        return null;
      }

      if (configured) {
        return configured;
      }

      return null;
    },
    [snipPaths, setIsTerminalOpen, setSnipResultEntry]
  );

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setSnipResultEntry(null);
      if (!snipWorkspaceRunning) {
        setSnipTerminalLog("");
        setSnipTerminalStatus("idle");
      }
      return;
    }

    const matchedEntry = snipHistoryByWorkspace[selectedWorkspaceId] ?? null;
    setSnipResultEntry(matchedEntry);
    if (matchedEntry) {
      setSnipTerminalStatus("success");
      setSnipTerminalLog(matchedEntry.terminalOutput ?? "");
    } else if (!snipWorkspaceRunning) {
      setSnipTerminalLog("");
      setSnipTerminalStatus("idle");
    }
  }, [selectedWorkspaceId, snipHistoryByWorkspace, snipWorkspaceRunning, setSnipResultEntry]);

  const runSnipScan = useCallback(
    async (workspace: WorkspaceEntry, source: "workspace" | "overview") => {
      const configuredPath = resolveSnipPath(workspace);
      if (workspace.type === "local" && !configuredPath) {
        return;
      }

      if (workspace.type === "github") {
        const ownerLogin = workspace.metadata.repo.owner?.login ?? null;
        const fallbackOwner = workspace.metadata.repo.full_name?.split("/")[0] ?? null;
        const owner = ownerLogin ?? fallbackOwner;
        if (!owner) {
          setIsTerminalOpen(true);
          setSnipTerminalStatus("error");
          setSnipTerminalLog(`[snip] Repository owner information is missing for ${workspace.name}.`);
          setSnipResultEntry(null);
          return;
        }
      }

      const pathDescriptor = configuredPath
        ? ` at ${configuredPath}`
        : workspace.type === "github"
        ? ` (GitHub ${workspace.metadata.repo.full_name ?? workspace.name})`
        : "";
      const intro = `[snip] Preparing scan for ${workspace.name}${pathDescriptor}`;
      setSnipWorkspaceRunning(workspace.id);
      setIsTerminalOpen(true);
      setTerminalSuppressed(false);
      setSnipTerminalStatus("running");
      setSnipTerminalLog(intro);
      setSnipReport(null);
      setSnipVulnerOpen(false);
      setControlOpen(false);
      setControlWorkspaceId(null);

      try {
        const requestBody: Record<string, unknown> = {
          workspaceId: workspace.id,
          source,
          workspaceName: workspace.name,
          workspaceType: workspace.type,
        };

        if (configuredPath) {
          requestBody.path = configuredPath;
        }

        if (workspace.type === "github") {
          const repo = workspace.metadata.repo;
          const owner = repo.owner?.login ?? repo.full_name?.split("/")[0];
          if (owner) {
            requestBody.repo = {
              owner,
              name: repo.name,
              fullName: repo.full_name ?? `${owner}/${repo.name}`,
              branch: workspace.metadata.branch,
              defaultBranch: repo.default_branch,
            };
          }
        }

        const response = await fetch("/api/snip/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        const payload = await response.json();

        const terminalOutput = typeof payload?.terminalOutput === "string" ? payload.terminalOutput : "";
        const resolvedPath = typeof payload?.resolvedPath === "string" ? payload.resolvedPath : null;
        const combinedLog = [
          intro,
          resolvedPath ? `[snip] Using ${resolvedPath}` : null,
          terminalOutput || "[snip] No console output was produced.",
        ]
          .filter(Boolean)
          .join("\n");
        setSnipTerminalLog(combinedLog);

        if (!response.ok || !payload?.report) {
          setSnipTerminalStatus("error");
          if (payload?.error) {
            setSnipTerminalLog((prev) => `${prev}\n[snip] ${payload.error}`);
          }
          if (selectedWorkspaceId === workspace.id) {
            setSnipResultEntry(null);
          }
          return;
        }

        const entry: SnipHistoryEntry = {
          id: typeof payload?.historyId === "string" ? payload.historyId : crypto.randomUUID(),
          workspaceId: workspace.id,
          source,
          triggeredAt: new Date().toISOString(),
          durationMs: typeof payload?.durationMs === "number" ? payload.durationMs : 0,
          path: resolvedPath ?? configuredPath ?? workspace.name,
          report: payload.report as SnipReport,
          terminalOutput,
        };

        upsertHistoryEntry(entry);
        if (selectedWorkspaceId === workspace.id) {
          setSnipResultEntry(entry);
        }

        setSnipTerminalStatus(payload.success ? "success" : "error");
        setSnipReport(payload.report as SnipReport);
        setSnipVulnerOpen(true);
      } catch (error) {
        setSnipTerminalStatus("error");
        const message = error instanceof Error ? error.message : String(error);
        setSnipTerminalLog((prev) => `${prev}\n[snip] Failed to run scanner: ${message}`);
        setSnipResultEntry(null);
      } finally {
        setSnipWorkspaceRunning(null);
      }
    },
    [resolveSnipPath, selectedWorkspaceId, setIsTerminalOpen, setSnipResultEntry, setTerminalSuppressed, upsertHistoryEntry]
  );

  const openSnipVulner = useCallback(() => {
    setSnipVulnerOpen(true);
  }, []);

  const closeSnipVulner = useCallback(() => {
    setSnipVulnerOpen(false);
  }, []);

  const openControlPanel = useCallback((targetWorkspaceId?: string) => {
    setControlWorkspaceId(targetWorkspaceId ?? null);
    setControlOpen(true);
  }, []);

  const closeControlPanel = useCallback(() => {
    setControlOpen(false);
    setControlWorkspaceId(null);
  }, []);

  return {
    snipTerminalStatus,
    snipTerminalLog,
    snipReport,
    snipVulnerOpen,
    snipWorkspaceRunning,
    controlOpen,
    controlWorkspaceId,
    snipPaths,
    snipResultEntry,
    fetchSnipPaths,
    handleSaveSnipPath,
    openControlPanel,
    closeControlPanel,
    openSnipVulner,
    closeSnipVulner,
    runSnipScan,
    handleHistorySync,
  };
};
