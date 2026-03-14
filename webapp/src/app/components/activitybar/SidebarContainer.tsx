"use client";

import React, { useEffect, useRef, useCallback } from "react";
import Sidebar from "./sidebar";
import {
  ACTIVITY_BAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
} from "@/app/lib/constants";
import { ExplorerMode, WorkspaceEntry } from "@/app/types/gitwork.types";

export type SidebarContainerProps = {
  // Sidebar state
  sidebarWidth: number;
  isSidebarCollapsed: boolean;
  onSidebarWidthChange: (width: number) => void;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
  sidebarSnapshotRef: React.MutableRefObject<number>;

  // Sidebar content props
  explorerMode: ExplorerMode;
  onShowWelcome: () => void;
  allWorkspaces: WorkspaceEntry[];
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (id: string, forceReload?: boolean) => void;
  onTriggerLocalImport: () => void;
  onRemoveLocal: (id: string) => void;
  onRemoveGithub: (id: string) => void;
  githubError: string | null;
  selectedWorkspace: WorkspaceEntry | null;
  loadingWorkspaceId: string | null;
  onRunSnip?: () => void;
  snipWorkspaceRunningId?: string | null;
  onFileClick: (path: string) => void;
};

const SidebarContainer: React.FC<SidebarContainerProps> = ({
  sidebarWidth,
  isSidebarCollapsed,
  onSidebarWidthChange,
  onSidebarCollapsedChange,
  sidebarSnapshotRef,
  explorerMode,
  onShowWelcome,
  allWorkspaces,
  selectedWorkspaceId,
  onSelectWorkspace,
  onTriggerLocalImport,
  onRemoveLocal,
  onRemoveGithub,
  githubError,
  selectedWorkspace,
  loadingWorkspaceId,
  onRunSnip,
  snipWorkspaceRunningId,
  onFileClick,
}) => {
  const draggingSidebar = useRef(false);

  const sidebarEffectiveWidth = isSidebarCollapsed ? 4 : sidebarWidth;

  const onSidebarDragStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.button !== 0) return;
    draggingSidebar.current = true;
    document.body.style.cursor = "col-resize";
  }, []);

  // Sync snapshot when width changes
  useEffect(() => {
    sidebarSnapshotRef.current = Math.max(sidebarWidth, MIN_SIDEBAR_WIDTH);
  }, [sidebarWidth, sidebarSnapshotRef]);

  // Handle mouse move and mouse up for drag resizing
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!draggingSidebar.current) return;

      const proposed = event.clientX - ACTIVITY_BAR_WIDTH;
      if (proposed <= MIN_SIDEBAR_WIDTH * 0.5) {
        sidebarSnapshotRef.current = Math.max(sidebarWidth, MIN_SIDEBAR_WIDTH);
        onSidebarCollapsedChange(true);
        draggingSidebar.current = false;
        document.body.style.cursor = "";
        return;
      }
      const clamped = Math.min(Math.max(proposed, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
      sidebarSnapshotRef.current = clamped;
      onSidebarWidthChange(clamped);
      onSidebarCollapsedChange(false);
    };

    const handleMouseUp = () => {
      if (draggingSidebar.current) {
        draggingSidebar.current = false;
        document.body.style.cursor = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [sidebarWidth, onSidebarWidthChange, onSidebarCollapsedChange, sidebarSnapshotRef]);

  return (
    <aside
      style={{ width: sidebarEffectiveWidth }}
      className={`group relative h-full overflow-hidden ${
        isSidebarCollapsed ? "bg-[#161616]" : "bg-[#1f1f1f] border-r border-[#242425]"
      }`}
    >
      <div className={isSidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}>
        <Sidebar
          explorerMode={explorerMode}
          onShowWelcome={onShowWelcome}
          allWorkspaces={allWorkspaces}
          selectedWorkspaceId={selectedWorkspaceId}
          onSelectWorkspace={onSelectWorkspace}
          onTriggerLocalImport={onTriggerLocalImport}
          onRemoveLocal={onRemoveLocal}
          onRemoveGithub={onRemoveGithub}
          githubError={githubError}
          selectedWorkspace={selectedWorkspace}
          loadingWorkspaceId={loadingWorkspaceId}
          onRunSnip={onRunSnip}
          snipWorkspaceRunningId={snipWorkspaceRunningId}
          onFileClick={onFileClick}
        />
      </div>
      <div
        onMouseDown={onSidebarDragStart}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-[#2f2f31]"
      />
    </aside>
  );
};

export default SidebarContainer;
