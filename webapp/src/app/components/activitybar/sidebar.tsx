"use client";

import React from "react";
import { AlertCircle, FolderPlus, Loader2, RefreshCcw, X } from "lucide-react";
import ExplorerTreeItem from "@/app/components/layout/ExplorerTreeItem";
import { ExplorerMode, WorkspaceEntry } from "@/app/types/gitwork.types";

type Props = {
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
	// Optional hooks used by Dashboard view; Sidebar doesn't need to render these directly.
	onRunSnip?: () => void;
	snipWorkspaceRunningId?: string | null;
  onFileClick: (path: string) => void;
};

const Sidebar: React.FC<Props> = ({
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
	onFileClick,
}) => {
	const isWorkspaceView = explorerMode === "workspace";

	return (
		<div className="flex h-full flex-col">
			<SidebarHeader />
			<div className="flex-1 overflow-auto text-xs text-gray-300">
				<div className="px-3 py-3 space-y-6">
					<GettingStarted onShowWelcome={onShowWelcome} active={explorerMode === "welcome"} />

					<WorkspaceList
						workspaces={allWorkspaces}
						selectedId={selectedWorkspaceId}
						explorerMode={explorerMode}
						onSelect={onSelectWorkspace}
						onRemoveLocal={onRemoveLocal}
						onRemoveGithub={onRemoveGithub}
						onTriggerLocalImport={onTriggerLocalImport}
					/>

					{githubError && isWorkspaceView && selectedWorkspace?.type === "github" ? (
						<InlineError icon={<AlertCircle size={12} />} text={githubError} />
					) : null}

					{isWorkspaceView && selectedWorkspace ? (
						<WorkspaceTree
							workspace={selectedWorkspace}
							loading={loadingWorkspaceId === selectedWorkspaceId}
							onFileClick={onFileClick}
						/>
					) : null}
				</div>
			</div>
		</div>
	);
};

export default Sidebar;

function SidebarHeader() {
	return (
		<div className="h-9 border-b border-[#262628] flex items-center justify-between px-3 text-xs uppercase tracking-wide text-gray-400">
			<span>Explorer</span>
			<span className="text-[10px] text-gray-500" />
		</div>
	);
}

function GettingStarted({ onShowWelcome, active }: { onShowWelcome: () => void; active: boolean }) {
	return (
		<div>
			<div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2">Getting started</div>
			<button
				type="button"
				onClick={onShowWelcome}
				className={`w-full rounded px-3 py-2 text-left text-xs transition cursor-pointer ${
					active ? "bg-[#2a2a2c] text-white" : "bg-[#202022] text-gray-300 hover:bg-[#242426] hover:text-white"
				}`}
			>
				HOME
			</button>
		</div>
	);
}

type WorkspaceListProps = {
	workspaces: WorkspaceEntry[];
	selectedId: string | null;
	explorerMode: ExplorerMode;
	onSelect: (id: string, forceReload?: boolean) => void;
	onRemoveLocal: (id: string) => void;
	onRemoveGithub: (id: string) => void;
	onTriggerLocalImport: () => void;
};

function WorkspaceList({
	workspaces,
	selectedId,
	explorerMode,
	onSelect,
	onRemoveLocal,
	onRemoveGithub,
	onTriggerLocalImport,
}: WorkspaceListProps) {
	const hasWorkspaces = workspaces.length > 0;
	return (
		<div>
			<div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2">
				<span>Workspaces</span>
				<button
					type="button"
					onClick={onTriggerLocalImport}
					className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition cursor-pointer"
				>
					<FolderPlus size={12} />
					Local
				</button>
			</div>
			<div className="space-y-1">
				{!hasWorkspaces ? (
					<EmptyWorkspacesCard />
				) : (
					workspaces.map((workspace) => {
						const isActive = explorerMode === "workspace" && workspace.id === selectedId;
						return (
							<WorkspaceItem
								key={workspace.id}
								workspace={workspace}
								active={isActive}
								onSelect={onSelect}
								onRemoveLocal={onRemoveLocal}
								onRemoveGithub={onRemoveGithub}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}

function WorkspaceItem({
	workspace,
	active,
	onSelect,
	onRemoveLocal,
	onRemoveGithub,
}: {
	workspace: WorkspaceEntry;
	active: boolean;
	onSelect: (id: string, forceReload?: boolean) => void;
	onRemoveLocal: (id: string) => void;
	onRemoveGithub: (id: string) => void;
}) {
	const wrapperClasses = active
		? "border-[#3a3a3d] bg-[#2a2a2c]"
		: "border-transparent bg-[#202022] hover:border-[#2c2c2f] hover:bg-[#242426]";

	return (
		<div className={`group flex items-center gap-2 rounded border px-3 py-2 transition cursor-pointer ${wrapperClasses}`}>
			<button type="button" onClick={() => onSelect(workspace.id)} className="flex-1 text-left cursor-pointer">
				<div className={`text-xs font-medium ${active ? "text-white" : "text-gray-300 group-hover:text-white"}`}>
					{workspace.name}
				</div>
				<div className="text-[10px] text-gray-500">
					{workspace.type === "local" ? workspace.summary : workspace.metadata.repo.full_name}
				</div>
			</button>
			{workspace.type === "local" ? (
				<IconButton title="Remove workspace" onClick={() => onRemoveLocal(workspace.id)}>
					<X size={12} />
				</IconButton>
			) : (
				<div className="flex items-center gap-1">
					<IconButton title="Reload repository tree" onClick={() => onSelect(workspace.id, true)}>
						<RefreshCcw size={12} />
					</IconButton>
					<IconButton title="Close workspace" onClick={() => onRemoveGithub(workspace.id)}>
						<X size={12} />
					</IconButton>
				</div>
			)}
		</div>
	);
}

function WorkspaceTree({ workspace, loading, onFileClick }: { workspace: WorkspaceEntry; loading: boolean; onFileClick: (path: string) => void }) {
	return (
		<div>
			<div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-gray-500">
				<span>Files</span>
			</div>
			{workspace.tree ? (
				<div className="space-y-0.5 pb-4">
					{workspace.tree.map((node) => (
						<ExplorerTreeItem key={`tree-${node.name}`} node={node} path={node.name} onFileClick={(path) => onFileClick(path)} />
					))}
				</div>
			) : workspace.type === "github" ? (
				<div className="rounded border border-dashed border-[#2c2c2c] bg-[#1f1f22] px-3 py-3 text-[11px] text-gray-500">
					Sync the repository to load its file tree.
				</div>
			) : null}
			{loading ? (
				<div className="text-[11px] text-gray-500 flex items-center gap-2 mt-2">
					<Loader2 className="h-3 w-3 animate-spin" />
					Syncing repository files...
				</div>
			) : null}
		</div>
	);
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			className="p-1 text-gray-500 hover:text-white transition cursor-pointer"
			title={title}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

function EmptyWorkspacesCard() {
	return (
		<div className="rounded border border-dashed border-[#2c2c2c] bg-[#1f1f22] px-3 py-3 text-[11px] text-gray-500">
			Import a workspace to see it here.
		</div>
	);
}

function InlineError({ icon, text }: { icon: React.ReactNode; text: string }) {
	return (
		<div className="text-[11px] text-red-300 flex items-center gap-2">
			{icon}
			{text}
		</div>
	);
}

