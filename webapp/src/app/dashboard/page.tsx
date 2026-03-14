"use client";

import React, { useCallback, useMemo, useRef } from "react";

import { signIn, useSession } from "next-auth/react";
import ActivityBar from "../components/activitybar/page";
import Toolbar from "../components/toolbar/page";
import WelcomePanel from "../components/WelcomePanel";
import Terminal, { TerminalItem } from "../components/layout/AvacxTerminal";
import WorkspaceMain from "../components/WorkspaceMain";
import SidebarContainer from "../components/activitybar/SidebarContainer";
import {
  LOCAL_FILECACHE_PREFIX,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
} from "../lib/constants";
import { buildTreeFromFlatPaths, countFilesInNodes, isBrowser } from "../lib/utils";
import { LocalWorkspaceEntry, ViewTab } from "../types/gitwork.types";
import SnipVulnerPanel from "../components/layout/VulnerPanel";
import SnipControlPanel from "../components/interfaces/History/HistoryPanel";
import ToolboxPanel from "../components/interfaces/Toolbox/ToolboxPanel";
import { useDashboardPreferences } from "./scrap/useDashboardPreferences";
import { useFilePreview } from "./scrap/useFilePreview";
import { useSnipManager } from "./scrap/useSnipManager";
import { useWorkspaceManager } from "./scrap/useWorkspaceManager";

const DashboardPage = () => {
  const { data: session, status } = useSession();

  const displayName = useMemo(() => {
    const base =
      (session?.user as { username?: string } | undefined)?.username ||
      session?.user?.name ||
      session?.user?.email ||
      "there";
    if (typeof base === "string") {
      const trimmed = base.trim();
      if (trimmed.includes("@")) {
        return trimmed.split("@")[0];
      }
      return trimmed || "there";
    }
    return "there";
  }, [session]);

  const {
    activeTab,
    setActiveTab,
    sidebarWidth,
    setSidebarWidth,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isTerminalOpen,
    setIsTerminalOpen,
    terminalSuppressed,
    setTerminalSuppressed,
    isDraggingTerminal,
    terminalHeight,
    prefsReady,
    terminalInput,
    setTerminalInput,
    terminalLines,
    setTerminalLines,
    layoutRef,
    sidebarSnapshotRef,
    handleTerminalToggle,
    onTerminalDragStart,
    handleTerminalInputKeyDown,
  } = useDashboardPreferences({ displayName });

  const {
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
    allWorkspaces,
    selectedWorkspace,
    fetchGitHubRepos,
    handleWorkspaceSelect,
    removeLocalWorkspace,
    removeGitHubWorkspace,
  } = useWorkspaceManager({ status });

  const {
    previewPath,
    previewContent,
    previewLoading,
    previewError,
    handleExplorerFileClick,
  } = useFilePreview({ selectedWorkspace, selectedWorkspaceId });

  const {
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
  } = useSnipManager({
    status,
    selectedWorkspaceId,
    setIsTerminalOpen,
    setTerminalSuppressed,
  });

  const snipWorkspaceOptions = useMemo(
    () =>
      allWorkspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        type: workspace.type,
      })),
    [allWorkspaces]
  );

  const handleOpenControlPanel = useCallback(
    (targetWorkspaceId?: string) => {
      openControlPanel(targetWorkspaceId);
      setActiveTab("history");
    },
    [openControlPanel, setActiveTab]
  );

  const handleCloseControlPanel = useCallback(() => {
    closeControlPanel();
    setActiveTab((previous: ViewTab) => (previous === "history" ? "explorer" : previous));
  }, [closeControlPanel, setActiveTab]);

  const handleTabSelect = useCallback(
    (tab: ViewTab) => {
      if (tab === "explorer") {
        if (activeTab === "explorer" && !isSidebarCollapsed) {
          sidebarSnapshotRef.current = sidebarWidth;
          setIsSidebarCollapsed(true);
          return;
        }
        setActiveTab("explorer");
        setIsSidebarCollapsed(false);
        const restored = Math.min(
          Math.max(sidebarSnapshotRef.current || sidebarWidth, MIN_SIDEBAR_WIDTH),
          MAX_SIDEBAR_WIDTH
        );
        sidebarSnapshotRef.current = restored;
        setSidebarWidth(restored);
        return;
      }
      if (tab === "history") {
        handleOpenControlPanel();
        return;
      }
      setActiveTab(tab);
    },
    [
      activeTab,
      handleOpenControlPanel,
      isSidebarCollapsed,
      setActiveTab,
      setIsSidebarCollapsed,
      setSidebarWidth,
      sidebarSnapshotRef,
      sidebarWidth,
    ]
  );

  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const triggerLocalImport = () => {
    folderInputRef.current?.click();
  };

  const handleLocalFolderImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const first = files[0] as File & { webkitRelativePath?: string };
      const samplePath = first.webkitRelativePath || first.name;
      const segments = samplePath.split("/");
      const rootName = segments[0] || "Workspace";

      const fileArray = Array.from(files) as Array<File & { webkitRelativePath?: string }>;
      const paths: string[] = fileArray
        .map((file) => {
          const relative = file.webkitRelativePath;
          if (!relative) return file.name;
          return relative.split("/").slice(1).join("/");
        })
        .filter((path) => path && !path.endsWith("/"));

      if (paths.length === 0) {
        event.target.value = "";
        return;
      }

      const tree = buildTreeFromFlatPaths(
        rootName,
        paths.map((path) => ({ path, type: "file" as const }))
      );
      const fileCount = countFilesInNodes(tree);

      const fileMap: Record<string, File> = {};
      fileArray.forEach((file) => {
        const relative = file.webkitRelativePath || file.name;
        const key = relative.includes("/") ? relative.split("/").slice(1).join("/") : relative;
        if (key && !key.endsWith("/")) {
          fileMap[key] = file;
        }
      });

      let absolutePath: string | undefined;
      try {
        if (first.webkitRelativePath) {
          const fullPath = first.webkitRelativePath;
          const indexOfRoot = fullPath.indexOf(rootName);
          if (indexOfRoot >= 0) {
            absolutePath = fullPath.substring(0, indexOfRoot + rootName.length);
          }
        }
      } catch {
        // ignore
      }

      const workspace: LocalWorkspaceEntry = {
        id: `local-${Date.now()}`,
        name: rootName,
        type: "local",
        summary: `${fileCount} file${fileCount === 1 ? "" : "s"}`,
        tree,
        metadata: {
          importedAt: new Date().toISOString(),
          fileCount,
          absolutePath,
        },
        files: fileMap,
      };

      if (isBrowser()) {
        const SMALL_LIMIT = 512 * 1024;
        const filePromises = fileArray
          .filter((f) => (f.size || 0) <= SMALL_LIMIT)
          .map(async (f) => {
            try {
              const relative = f.webkitRelativePath || f.name;
              const key = relative.includes("/") ? relative.split("/").slice(1).join("/") : relative;
              if (!key || key.endsWith("/")) return;
              const text = await f.text();
              const storageKey = `${LOCAL_FILECACHE_PREFIX}:${workspace.id}:${key}`;
              try {
                window.localStorage.setItem(storageKey, text);
              } catch {
                // ignore
              }
            } catch {
              // ignore
            }
          });
        void Promise.allSettled(filePromises);
      }

      setLocalWorkspaces((previous) => [workspace, ...previous.filter((item) => item.name !== workspace.name)]);
      setSelectedWorkspaceId(workspace.id);
      setExplorerMode("workspace");
      event.target.value = "";
    },
    [setExplorerMode, setLocalWorkspaces, setSelectedWorkspaceId]
  );

  const snipForcesTerminal = snipWorkspaceRunning !== null || snipTerminalStatus === "running";
  const isTerminalVisible =
    prefsReady &&
    ((isTerminalOpen && !terminalSuppressed) || snipForcesTerminal) &&
    (activeTab === "explorer" || snipForcesTerminal);

  const terminalItems = useMemo<TerminalItem[]>(() => {
    const base: TerminalItem[] = terminalLines.map((text, index) => ({
      id: `text-${index}`,
      kind: "text",
      text,
    }));

    if (snipWorkspaceRunning && snipWorkspaceRunning === selectedWorkspaceId) {
      return [
        {
          id: `snip-running-${snipWorkspaceRunning}`,
          kind: "snip",
          status: "running",
          workspaceName: selectedWorkspace?.name ?? null,
          log: snipTerminalLog,
        },
        ...base,
      ];
    }

    if (snipResultEntry && snipResultEntry.workspaceId === selectedWorkspaceId) {
      return [
        {
          id: `snip-${snipResultEntry.id}`,
          kind: "snip",
          status: snipTerminalStatus,
          entry: snipResultEntry,
          workspaceName: selectedWorkspace?.name ?? null,
          log: snipTerminalLog,
        },
        ...base,
      ];
    }

    return base;
  }, [
    snipResultEntry,
    snipTerminalLog,
    snipTerminalStatus,
    snipWorkspaceRunning,
    selectedWorkspace?.name,
    selectedWorkspaceId,
    terminalLines,
  ]);

  const renderPlaceholder = (title: string, description: string) => (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#1b1b1d] text-center px-8 space-y-3">
      <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
      <p className="text-sm text-gray-400 max-w-md">{description}</p>
    </div>
  );

  return (
    <div className="h-screen bg-[#18181a] text-gray-200 flex flex-col overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar
          activeTab={activeTab}
          onTabSelect={handleTabSelect}
          isTerminalOpen={isTerminalOpen}
          onTerminalToggle={handleTerminalToggle}
        />
        <div className="flex-1 flex flex-col overflow-hidden" ref={layoutRef}>
          <div className="flex flex-1 overflow-hidden">
            <SidebarContainer
              sidebarWidth={sidebarWidth}
              isSidebarCollapsed={isSidebarCollapsed}
              onSidebarWidthChange={setSidebarWidth}
              onSidebarCollapsedChange={setIsSidebarCollapsed}
              sidebarSnapshotRef={sidebarSnapshotRef}
              explorerMode={explorerMode}
              onShowWelcome={() => {
                setExplorerMode("welcome");
                setSelectedWorkspaceId(null);
              }}
              allWorkspaces={allWorkspaces}
              selectedWorkspaceId={selectedWorkspaceId}
              onSelectWorkspace={(id, force) => void handleWorkspaceSelect(id, force)}
              onTriggerLocalImport={triggerLocalImport}
              onRemoveLocal={(id) => removeLocalWorkspace(id)}
              onRemoveGithub={(id) => removeGitHubWorkspace(id)}
              githubError={githubError}
              selectedWorkspace={selectedWorkspace}
              loadingWorkspaceId={loadingWorkspaceId}
              onRunSnip={() => selectedWorkspace && void runSnipScan(selectedWorkspace, "workspace")}
              snipWorkspaceRunningId={snipWorkspaceRunning}
              onFileClick={(p) => void handleExplorerFileClick(p)}
            />
            <section className="flex-1 flex flex-col overflow-hidden">
              {activeTab === "explorer" ? (
                explorerMode === "welcome" ? (
                  <WelcomePanel
                    name={displayName}
                    hasGithub={hasGithub}
                    isFetchingRepos={isFetchingRepos}
                    githubWorkspaces={githubWorkspaces}
                    githubError={githubError}
                    onSelectWorkspace={(id) => void handleWorkspaceSelect(id)}
                    onTriggerLocalImport={triggerLocalImport}
                    onConnectGithub={() => signIn("github")}
                    onRefreshRepos={() => void fetchGitHubRepos()}
                    localWorkspaces={localWorkspaces}
                    userResolved={userResolved}
                  />
                ) : selectedWorkspace ? (
                  <WorkspaceMain
                    workspace={selectedWorkspace}
                    loadingWorkspaceId={loadingWorkspaceId}
                    previewPath={previewPath}
                    previewContent={previewContent}
                    previewLoading={previewLoading}
                    previewError={previewError}
                    onReloadTree={(id) => void handleWorkspaceSelect(id, true)}
                    onSnip={() => void runSnipScan(selectedWorkspace, "workspace")}
                    snipBusy={snipWorkspaceRunning === selectedWorkspace.id}
                    onOpenControl={() => handleOpenControlPanel(selectedWorkspace.id)}
                    onOpenVulner={openSnipVulner}
                    hasSnipReport={Boolean(snipReport)}
                  />
                ) : (
                  renderPlaceholder(
                    "No workspace selected",
                    "Choose a workspace from the Explorer panel or import a folder to begin."
                  )
                )
              ) : activeTab === "toolbox" ? (
                <ToolboxPanel />
              ) : (
                renderPlaceholder("Nothing to show", "Select Explorer or open a panel to continue.")
              )}
            </section>
          </div>
          <div
            className={`bg-[#1b1b1d] border-t border-[#242425] ${
              isDraggingTerminal ? "transition-none" : "transition-[height] duration-150 ease-out"
            } overflow-hidden ${isTerminalVisible ? "" : "pointer-events-none"}`}
            style={{ height: isTerminalVisible ? `${terminalHeight}px` : "0px" }}
          >
            {isTerminalVisible && (
              <Terminal
                branch="main"
                shell="bash"
                items={terminalItems}
                inputValue={terminalInput}
                onInputChange={setTerminalInput}
                onInputKeyDown={handleTerminalInputKeyDown}
                onResizeStart={onTerminalDragStart}
                onHide={() => {
                  setIsTerminalOpen(false);
                  setTerminalSuppressed(true);
                }}
                onNewSession={() =>
                  setTerminalLines((previous) => [...previous, "--- opened new terminal session ---"])
                }
              />
            )}
          </div>
        </div>
      </div>
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleLocalFolderImport}
        // @ts-expect-error webkitdirectory is supported in Chromium-based browsers
        webkitdirectory="true"
      />
      <div className={`fixed inset-y-0 right-0 z-50 flex ${snipVulnerOpen ? "" : "pointer-events-none"}`}>
        <SnipVulnerPanel report={snipReport} open={snipVulnerOpen} onClose={closeSnipVulner} />
      </div>
      <SnipControlPanel
        open={controlOpen}
        onClose={handleCloseControlPanel}
        workspaceOptions={snipWorkspaceOptions}
        snipPaths={snipPaths}
        onSavePath={handleSaveSnipPath}
        onRefreshPaths={fetchSnipPaths}
        defaultWorkspaceId={controlWorkspaceId}
        onHistorySync={handleHistorySync}
      />
    </div>
  );
};

export default DashboardPage;
