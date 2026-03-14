import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  GITHUB_WORKSPACES_KEY,
  LOCAL_WORKSPACES_KEY,
  LOCAL_FILECACHE_PREFIX,
  STORAGE_KEYS,
} from "../../lib/constants";
import {
  buildTreeFromGitHub,
  countFilesInNodes,
  isBrowser,
} from "../../lib/utils";
import {
  ExplorerMode,
  GitHubRepo,
  GitHubTreeItem,
  GitHubWorkspaceEntry,
  LocalWorkspaceEntry,
  PersistedGitHubWorkspace,
  PersistedLocalWorkspace,
  WorkspaceEntry,
} from "../../types/gitwork.types";

type WorkspaceManagerOptions = {
  status: "loading" | "authenticated" | "unauthenticated";
};

export const useWorkspaceManager = ({ status }: WorkspaceManagerOptions) => {
  const [explorerMode, setExplorerMode] = useState<ExplorerMode>("welcome");
  const [localWorkspaces, setLocalWorkspaces] = useState<LocalWorkspaceEntry[]>([]);
  const [githubWorkspaces, setGitHubWorkspaces] = useState<GitHubWorkspaceEntry[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [loadingWorkspaceId, setLoadingWorkspaceId] = useState<string | null>(null);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [hasGithub, setHasGithub] = useState(false);
  const [userResolved, setUserResolved] = useState(false);

  const persistedGitHubRef = useRef<PersistedGitHubWorkspace[] | null>(null);
  const githubStorageReady = useRef(false);
  const initialWorkspaceIdRef = useRef<string | null>(null);
  const selectionStorageReady = useRef(false);

  const clearHeavyLocalStorage = useCallback(() => {
    if (!isBrowser()) return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (key.startsWith(`${LOCAL_FILECACHE_PREFIX}:`)) {
          toRemove.push(key);
        }
      }
      for (const key of toRemove) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore per-key failures
        }
      }
      try {
        window.localStorage.removeItem(GITHUB_WORKSPACES_KEY);
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }, []);

  const safeLocalStorageSet = useCallback(
    (key: string, value: string) => {
      if (!isBrowser()) return;
      try {
        window.localStorage.setItem(key, value);
      } catch {
        clearHeavyLocalStorage();
        try {
          window.localStorage.setItem(key, value);
        } catch (err) {
          console.warn(`[storage] Failed to persist key "${key}": quota exceeded`, err);
        }
      }
    },
    [clearHeavyLocalStorage]
  );

  useEffect(() => {
    if (!isBrowser()) {
      githubStorageReady.current = true;
      return;
    }
    try {
      const stored = window.localStorage.getItem(GITHUB_WORKSPACES_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as PersistedGitHubWorkspace[];
      if (!Array.isArray(parsed)) return;
      const sanitized = parsed.filter(
        (entry): entry is PersistedGitHubWorkspace =>
          !!entry &&
          typeof entry.id === "string" &&
          typeof entry.name === "string" &&
          typeof entry.summary === "string" &&
          entry.metadata !== null &&
          typeof entry.metadata === "object" &&
          !!entry.metadata.repo
      );
      if (sanitized.length > 0) {
        persistedGitHubRef.current = sanitized.map((entry) => ({
          ...entry,
          opened: entry.opened !== false,
        }));
      }
    } catch (error) {
      console.warn("Failed to restore GitHub workspaces", error);
    } finally {
      githubStorageReady.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;
    try {
      const stored = window.localStorage.getItem(LOCAL_WORKSPACES_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as PersistedLocalWorkspace[];
      if (!Array.isArray(parsed)) return;
      const hydrated = parsed.map<LocalWorkspaceEntry>((workspace) => ({
        ...workspace,
        type: "local" as const,
      }));
      setLocalWorkspaces(hydrated);
    } catch (error) {
      console.warn("Failed to restore local workspaces", error);
    }
  }, []);

  useEffect(() => {
    if (!isBrowser()) {
      selectionStorageReady.current = true;
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEYS.selectedWorkspace);
    if (typeof stored === "string" && stored) {
      initialWorkspaceIdRef.current = stored;
    }
    selectionStorageReady.current = true;
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;
    try {
      const payload: PersistedLocalWorkspace[] = localWorkspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        summary: workspace.summary,
        tree: workspace.tree,
        metadata: workspace.metadata,
      }));
      window.localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist local workspaces", error);
    }
  }, [localWorkspaces]);

  useEffect(() => {
    if (!githubStorageReady.current || !isBrowser()) return;
    if (githubWorkspaces.length === 0 && persistedGitHubRef.current && persistedGitHubRef.current.length > 0) {
      return;
    }
    try {
      const payload: PersistedGitHubWorkspace[] = githubWorkspaces
        .filter((workspace) => workspace.opened)
        .map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          summary: workspace.summary,
          tree: workspace.tree,
          metadata: workspace.metadata,
          opened: true,
        }));
      if (payload.length === 0) {
        window.localStorage.removeItem(GITHUB_WORKSPACES_KEY);
      } else {
        try {
          window.localStorage.setItem(GITHUB_WORKSPACES_KEY, JSON.stringify(payload));
        } catch {
          clearHeavyLocalStorage();
          try {
            window.localStorage.setItem(GITHUB_WORKSPACES_KEY, JSON.stringify(payload));
          } catch (err) {
            console.warn("[storage] Unable to persist GitHub workspaces: quota exceeded", err);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to persist GitHub workspaces", error);
    }
  }, [githubWorkspaces, clearHeavyLocalStorage]);

  useEffect(() => {
    let cancelled = false;
    if (status === "loading") return;
    if (status !== "authenticated") {
      setHasGithub(false);
      setUserResolved(true);
      return;
    }

    const resolveProviders = async () => {
      try {
        const response = await fetch("/api/user");
        if (!response.ok) throw new Error("Unable to fetch user profile.");
        const data = await response.json();
        if (cancelled) return;
        const providers: string[] = Array.isArray(data?.providers) ? data.providers : [];
        setHasGithub(providers.includes("github"));
      } catch {
        if (!cancelled) {
          setHasGithub(false);
        }
      } finally {
        if (!cancelled) {
          setUserResolved(true);
        }
      }
    };

    void resolveProviders();

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (!hasGithub) {
      setGitHubWorkspaces([]);
      setGithubError(null);
      return;
    }
    if (!persistedGitHubRef.current || persistedGitHubRef.current.length === 0) return;
    const entries = persistedGitHubRef.current;
    let applied = false;
    setGitHubWorkspaces((previous) => {
      if (previous.length > 0) {
        return previous;
      }
      applied = true;
      return entries.map<GitHubWorkspaceEntry>((workspace) => ({
        ...workspace,
        type: "github" as const,
        opened: workspace.opened !== false,
      }));
    });
    if (applied) {
      persistedGitHubRef.current = null;
    }
  }, [hasGithub]);

  const fetchGitHubRepos = useCallback(async () => {
    if (!hasGithub) return;
    setIsFetchingRepos(true);
    setGithubError(null);
    try {
      const response = await fetch("/api/github/repos");
      const payload = await response.json();
      if (!response.ok) {
        const message = typeof payload?.message === "string" ? payload.message : "Failed to fetch GitHub repositories.";
        throw new Error(message);
      }
      const repos = Array.isArray(payload?.repositories) ? (payload.repositories as GitHubRepo[]) : [];
      setGitHubWorkspaces((previous) => {
        const previousMap = new Map(previous.map((workspace) => [workspace.id, workspace]));
        return repos.map<GitHubWorkspaceEntry>((repo) => {
          const id = `github-${repo.id}`;
          const existing = previousMap.get(id);
          return {
            id,
            name: repo.name,
            type: "github",
            summary: repo.full_name ?? repo.name,
            tree: existing?.tree,
            metadata: {
              repo,
              branch: existing?.metadata.branch ?? repo.default_branch,
              fileCount: existing?.metadata.fileCount,
              syncedAt: existing?.metadata.syncedAt,
            },
            opened: existing?.opened ?? false,
          };
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch GitHub repositories.";
      setGithubError(message);
    } finally {
      setIsFetchingRepos(false);
    }
  }, [hasGithub]);

  useEffect(() => {
    if (!hasGithub) return;
    void fetchGitHubRepos();
  }, [hasGithub, fetchGitHubRepos]);

  const openedGitHubWorkspaces = useMemo(
    () => githubWorkspaces.filter((workspace) => workspace.opened),
    [githubWorkspaces]
  );

  const allWorkspaces = useMemo<WorkspaceEntry[]>(
    () => [...localWorkspaces, ...openedGitHubWorkspaces],
    [localWorkspaces, openedGitHubWorkspaces]
  );

  const selectedWorkspace = useMemo(() => {
    if (!selectedWorkspaceId) return null;
    return allWorkspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  }, [allWorkspaces, selectedWorkspaceId]);

  const handleWorkspaceSelect = useCallback(
    async (workspaceId: string, forceReload = false) => {
      if (initialWorkspaceIdRef.current) {
        initialWorkspaceIdRef.current = null;
        selectionStorageReady.current = true;
      }
      const workspaceFromOpened = allWorkspaces.find((entry) => entry.id === workspaceId);
      const workspace = workspaceFromOpened ?? githubWorkspaces.find((entry) => entry.id === workspaceId);
      if (!workspace) return;

      if (workspace.type === "github" && !workspace.opened) {
        setGitHubWorkspaces((previous) =>
          previous.map((entry) =>
            entry.id === workspaceId
              ? {
                  ...entry,
                  opened: true,
                }
              : entry
          )
        );
      }

      setExplorerMode("workspace");
      setSelectedWorkspaceId(workspaceId);

      if (workspace.type === "local") {
        return;
      }

      const owner = workspace.metadata.repo.owner?.login;
      if (!owner) {
        setGithubError("Repository owner information is missing.");
        return;
      }

      if (!forceReload && workspace.tree) {
        return;
      }

      setGithubError(null);
      setLoadingWorkspaceId(workspaceId);
      try {
        const branch = workspace.metadata.branch || "main";
        const response = await fetch(
          `/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            workspace.metadata.repo.name
          )}/tree?ref=${encodeURIComponent(branch)}`
        );
        const payload = await response.json();
        if (!response.ok) {
          const message = typeof payload?.message === "string" ? payload.message : "Failed to load repository tree.";
          throw new Error(message);
        }
        const treeItems = Array.isArray(payload.tree) ? (payload.tree as GitHubTreeItem[]) : [];
        const tree = buildTreeFromGitHub(workspace.metadata.repo.name, treeItems);
        const fileCount = countFilesInNodes(tree);
        setGitHubWorkspaces((previous) =>
          previous.map((entry) =>
            entry.id !== workspaceId
              ? entry
              : {
                  ...entry,
                  opened: true,
                  tree,
                  metadata: {
                    ...entry.metadata,
                    branch,
                    fileCount,
                    syncedAt: new Date().toISOString(),
                  },
                }
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load repository tree.";
        setGithubError(message);
      } finally {
        setLoadingWorkspaceId(null);
      }
    },
    [allWorkspaces, githubWorkspaces]
  );

  useEffect(() => {
    const targetId = initialWorkspaceIdRef.current;
    if (!targetId) return;
    const exists = allWorkspaces.some((workspace) => workspace.id === targetId);
    if (!exists) return;
    initialWorkspaceIdRef.current = null;
    void handleWorkspaceSelect(targetId);
    selectionStorageReady.current = true;
  }, [allWorkspaces, handleWorkspaceSelect]);

  useEffect(() => {
    const pendingId = initialWorkspaceIdRef.current;
    if (!pendingId) return;
    const exists = allWorkspaces.some((workspace) => workspace.id === pendingId);
    if (exists) return;
    if (pendingId.startsWith("local-")) {
      initialWorkspaceIdRef.current = null;
      selectionStorageReady.current = true;
      if (isBrowser()) {
        window.localStorage.removeItem(STORAGE_KEYS.selectedWorkspace);
      }
      return;
    }
    if (!hasGithub) return;
    if (isFetchingRepos) return;
    if (persistedGitHubRef.current && persistedGitHubRef.current.length > 0) return;
    initialWorkspaceIdRef.current = null;
    selectionStorageReady.current = true;
    if (isBrowser()) {
      window.localStorage.removeItem(STORAGE_KEYS.selectedWorkspace);
    }
  }, [allWorkspaces, hasGithub, isFetchingRepos]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    const exists = allWorkspaces.some((workspace) => workspace.id === selectedWorkspaceId);
    if (!exists) {
      setSelectedWorkspaceId(null);
      setExplorerMode("welcome");
    }
  }, [selectedWorkspaceId, allWorkspaces]);

  useEffect(() => {
    if (!selectionStorageReady.current || initialWorkspaceIdRef.current) return;
    if (!isBrowser()) return;
    if (selectedWorkspaceId) {
      safeLocalStorageSet(STORAGE_KEYS.selectedWorkspace, selectedWorkspaceId);
    } else {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.selectedWorkspace);
      } catch {
        // ignore
      }
    }
  }, [selectedWorkspaceId, safeLocalStorageSet]);

  const removeLocalWorkspace = useCallback(
    (workspaceId: string) => {
      setLocalWorkspaces((previous) => previous.filter((workspace) => workspace.id !== workspaceId));
      if (selectedWorkspaceId === workspaceId) {
        setSelectedWorkspaceId(null);
        setExplorerMode("welcome");
      }
    },
    [selectedWorkspaceId]
  );

  const removeGitHubWorkspace = useCallback(
    (workspaceId: string) => {
      setGitHubWorkspaces((previous) =>
        previous.map((workspace) => (workspace.id === workspaceId ? { ...workspace, opened: false } : workspace))
      );
      if (selectedWorkspaceId === workspaceId) {
        setSelectedWorkspaceId(null);
        setExplorerMode("welcome");
      }
    },
    [selectedWorkspaceId]
  );

  return {
    explorerMode,
    setExplorerMode,
    localWorkspaces,
    setLocalWorkspaces,
    githubWorkspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    loadingWorkspaceId,
    isFetchingRepos,
    githubError,
    hasGithub,
    userResolved,
    openedGitHubWorkspaces,
    allWorkspaces,
    selectedWorkspace,
    fetchGitHubRepos,
    handleWorkspaceSelect,
    removeLocalWorkspace,
    removeGitHubWorkspace,
  };
};
