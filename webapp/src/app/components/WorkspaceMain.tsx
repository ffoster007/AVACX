"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Clock, ExternalLink, FileText, Folder, GitBranch, Loader2, RefreshCcw, Github, Scan, History, ShieldAlert } from "lucide-react";
import { WorkspaceEntry } from "@/app/types/gitwork.types";
import { formatAbsoluteTimestamp, formatRelativeTime, highlightCode } from "@/app/lib/utils";

type Props = {
  workspace: WorkspaceEntry;
  loadingWorkspaceId: string | null;
  previewPath: string | null;
  previewContent: string;
  previewLoading: boolean;
  previewError: string | null;
  onReloadTree: (workspaceId: string) => void;
  onSnip?: () => void;
  snipBusy?: boolean;
  onOpenControl?: () => void;
  onOpenVulner?: () => void;
  hasSnipReport?: boolean;
};

const WorkspaceMain: React.FC<Props> = ({
  workspace,
  loadingWorkspaceId,
  previewPath,
  previewContent,
  previewLoading,
  previewError,
  onReloadTree,
  onSnip,
  snipBusy = false,
  onOpenControl,
  onOpenVulner,
  hasSnipReport = false,
}) => {
  const lines = useMemo(() => previewContent.split(/\r?\n/), [previewContent]);
  const highlightedLines = useMemo(() => highlightCode(previewContent).split("\n"), [previewContent]);
  const isGithubSyncing = workspace.type === "github" && loadingWorkspaceId === workspace.id;
  const fileCount = workspace.metadata.fileCount;
  const repo = workspace.type === "github" ? workspace.metadata.repo : null;

  if (isGithubSyncing) {
    return (
      <CenteredMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} text="Syncing repository tree..." />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#1b1b1d]">
      <WorkspaceHeader
        workspace={workspace}
        repo={repo}
        fileCount={fileCount}
        onOpenVulner={onOpenVulner}
        onOpenControl={onOpenControl}
        onSnip={onSnip}
        snipBusy={snipBusy}
        hasSnipReport={hasSnipReport}
      />
      {snipBusy ? <SnipBanner /> : null}
      <div className="flex-1 overflow-auto px-8 py-6 text-sm text-gray-300 space-y-6">
        {previewPath ? (
          <PreviewSection
            path={previewPath}
            loading={previewLoading}
            error={previewError}
            lines={lines}
            highlightedLines={highlightedLines}
          />
        ) : (
          <WorkspaceOverview workspace={workspace} repo={repo} onReloadTree={onReloadTree} />
        )}
      </div>
    </div>
  );
};

export default WorkspaceMain;

function WorkspaceHeader({
  workspace,
  repo,
  fileCount,
  onOpenVulner,
  onOpenControl,
  onSnip,
  snipBusy,
  hasSnipReport,
}: {
  workspace: WorkspaceEntry;
  repo: WorkspaceEntry["metadata"]["repo"] | null;
  fileCount: WorkspaceEntry["metadata"]["fileCount"];
  onOpenVulner?: () => void;
  onOpenControl?: () => void;
  onSnip?: () => void;
  snipBusy: boolean;
  hasSnipReport: boolean;
}) {
  return (
    <div className="h-11 border-b border-[#262628] flex items-center justify-between px-6 text-xs text-gray-400">
      <div className="flex items-center gap-3 text-gray-200">
        <span className="text-sm font-medium text-white">{workspace.name}</span>
        {workspace.type === "github" && workspace.metadata.branch ? (
          <span className="text-[11px] bg-[#26262a] px-2 py-0.5 rounded">branch: {workspace.metadata.branch}</span>
        ) : null}
        {workspace.type === "github" && repo?.private ? (
          <span className="text-[11px] bg-[#2c1f31] text-[#f472b6] px-2 py-0.5 rounded">Private</span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-gray-500">
          {typeof fileCount === "number"
            ? `${fileCount} file${fileCount === 1 ? "" : "s"}`
            : workspace.type === "github"
            ? repo?.language ?? ""
            : ""}
        </span>
        {hasSnipReport && onOpenVulner ? (
          <Button onClick={onOpenVulner} icon={<ShieldAlert size={14} />} label="Insights" />
        ) : null}
        {onOpenControl ? <Button onClick={onOpenControl} icon={<History size={14} />} label="History" /> : null}
        {onSnip ? (
          <Button
            onClick={onSnip}
            icon={snipBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scan size={14} />}
            label={snipBusy ? "Scanning" : "Run"}
            disabled={snipBusy}
          />
        ) : null}
      </div>
    </div>
  );
}

function Button({
  onClick,
  icon,
  label,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded border border-[#303033] bg-[#202024] px-3 py-1.5 text-[11px] text-gray-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );
}

function SnipBanner() {
  return (
    <div className="border-b border-[#262628] bg-[#202024]/60 px-6 py-3 text-xs text-gray-400 flex items-center gap-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running Snip security scan...
    </div>
  );
}

function PreviewSection({
  path,
  loading,
  error,
  lines,
  highlightedLines,
}: {
  path: string;
  loading: boolean;
  error: string | null;
  lines: string[];
  highlightedLines: string[];
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Preview: {path}</h2>
        {loading ? (
          <span className="inline-flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading
          </span>
        ) : null}
      </div>
      {error ? (
        <div className="rounded border border-[#3a2b2b] bg-[#2a1f1f] px-3 py-2 text-[12px] text-red-300">{error}</div>
      ) : (
        <CodePreview lines={lines} highlightedLines={highlightedLines} />
      )}
    </section>
  );
}

function CodePreview({ lines, highlightedLines }: { lines: string[]; highlightedLines: string[] }) {
  return (
    <div className="rounded border border-[#2f2f31] bg-[#101013] overflow-auto max-h-[70vh]">
      <div className="flex min-w-0 overflow-hidden">
        <div className="select-none border-r border-[#2f2f31] bg-[#0b0b0e] px-3 py-3 text-right font-mono text-[12px] text-gray-600">
          {lines.map((_, index) => (
            <div key={`ln-${index}`} className="leading-[18px]">
              {index + 1}
            </div>
          ))}
        </div>
        <div className="flex-1 px-3 py-3 font-mono text-[12px] leading-[18px] text-gray-200 min-w-0 overflow-x-auto">
          {highlightedLines.map((html, index) => (
            <div key={`code-${index}`} className="whitespace-pre leading-[18px]">
              <span dangerouslySetInnerHTML={{ __html: html.length ? html : "&nbsp;" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspaceOverview({
  workspace,
  repo,
  onReloadTree,
}: {
  workspace: WorkspaceEntry;
  repo: WorkspaceEntry["metadata"]["repo"] | null;
  onReloadTree: (id: string) => void;
}) {
  return (
    <>
      {workspace.type === "github" && repo ? (
        <RepoOverview workspace={workspace} repo={repo} />
      ) : workspace.type === "local" ? (
        <LocalOverview workspace={workspace} />
      ) : null}

      {workspace.tree ? (
        <TopLevelSection workspace={workspace} />
      ) : workspace.type === "github" ? (
        <MissingTree onReload={() => onReloadTree(workspace.id)} />
      ) : null}
    </>
  );
}

function RepoOverview({ workspace, repo }: { workspace: WorkspaceEntry; repo: NonNullable<WorkspaceEntry["metadata"]["repo"]> }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-white">Repository overview</h2>
      <p className="text-sm text-gray-400 max-w-3xl">{repo.description || "No description provided."}</p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1">
          <GitBranch size={14} />
          {workspace.metadata.branch}
        </span>
        {repo.owner?.login ? (
          <span className="inline-flex items-center gap-1">
            <Github size={14} />
            {repo.owner.login}
          </span>
        ) : null}
        {repo.updated_at ? (
          <span className="inline-flex items-center gap-1">
            <Clock size={14} />
            Updated {formatRelativeTime(repo.updated_at)}
          </span>
        ) : null}
      </div>
      <div>
        <Link
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs text-[#63a4ff] hover:text-[#8abaff] transition"
        >
          <ExternalLink size={14} />
          Open on GitHub
        </Link>
      </div>
    </section>
  );
}

function LocalOverview({ workspace }: { workspace: WorkspaceEntry }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-white">Local workspace</h2>
      <p className="text-sm text-gray-400 max-w-3xl">
        This workspace lives on your machine only. Import the folder again to refresh its contents.
      </p>
      <p className="text-xs text-gray-500">Imported {formatAbsoluteTimestamp(workspace.metadata.importedAt)}</p>
    </section>
  );
}

function TopLevelSection({ workspace }: { workspace: WorkspaceEntry }) {
  const children = workspace.tree?.[0]?.children ?? [];
  const hasChildren = children.length > 0;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Top-level items</h3>
      </div>
      {hasChildren ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((node) => (
            <div key={`summary-${node.name}`} className="flex items-center justify-between rounded border border-[#2f2f31] bg-[#202022] px-3 py-3">
              <div className="flex items-center gap-2 text-gray-200">
                {node.type === "folder" ? <Folder size={16} className="text-[#6aa0ff]" /> : <FileText size={16} className="text-[#9cdcfe]" />}
                <span className="text-sm">{node.name}</span>
              </div>
              <span className="text-[11px] text-gray-500">
                {node.type === "folder"
                  ? `${node.children?.length ?? 0} item${(node.children?.length ?? 0) === 1 ? "" : "s"}`
                  : "file"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-[#2f2f31] bg-[#1f1f22] px-4 py-6 text-sm text-gray-400">
          No files detected in this workspace yet.
        </div>
      )}
    </section>
  );
}

function MissingTree({ onReload }: { onReload: () => void }) {
  return (
    <div className="rounded border border-[#2f2f31] bg-[#202022] px-4 py-4 text-sm text-gray-400 space-y-3">
      <p>Repository structure not loaded. Fetch it to browse files.</p>
      <button
        type="button"
        onClick={onReload}
        className="inline-flex items-center gap-2 text-xs text-[#63a4ff] hover:text-[#8abaff] transition"
      >
        <RefreshCcw size={14} />
        Load repository tree
      </button>
    </div>
  );
}

function CenteredMessage({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#1b1b1d] text-gray-300">
      <div className="flex items-center gap-3 text-sm">
        {icon}
        {text}
      </div>
    </div>
  );
}
