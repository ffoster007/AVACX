"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock, ExternalLink, FolderPlus, Github, Loader2, RefreshCcw, Search } from "lucide-react";
import { formatRelativeTime } from "@/app/lib/utils";
import { WelcomePanelProps } from "@/app/types/gitwork.types";

const LOCAL_LIMIT = 4;
const GITHUB_LIMIT_DEFAULT = 6;
const GITHUB_LIMIT_FILTERED = 30;

const WelcomePanel: React.FC<WelcomePanelProps> = ({
  name,
  hasGithub,
  isFetchingRepos,
  githubWorkspaces,
  githubError,
  onSelectWorkspace,
  onTriggerLocalImport,
  onConnectGithub,
  onRefreshRepos,
  localWorkspaces,
  userResolved,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const hasQuery = trimmedQuery.length > 0;

  const filteredGithubWorkspaces = useMemo(() => {
    if (!trimmedQuery) return githubWorkspaces;
    return githubWorkspaces.filter((workspace) => {
      const repo = workspace.metadata.repo;
      const nameMatch = workspace.name.toLowerCase().includes(trimmedQuery);
      const fullNameMatch = (repo.full_name || "").toLowerCase().includes(trimmedQuery);
      const descriptionMatch = (repo.description || "").toLowerCase().includes(trimmedQuery);
      return nameMatch || fullNameMatch || descriptionMatch;
    });
  }, [githubWorkspaces, trimmedQuery]);

  const githubEntries = useMemo(() => {
    const limit = hasQuery ? GITHUB_LIMIT_FILTERED : GITHUB_LIMIT_DEFAULT;
    return filteredGithubWorkspaces.slice(0, limit);
  }, [filteredGithubWorkspaces, hasQuery]);

  const localEntries = useMemo(() => localWorkspaces.slice(0, LOCAL_LIMIT), [localWorkspaces]);

  return (
    <div className="flex-1 flex flex-col bg-[#1b1b1d]">
      <PanelHeader />
      <div className="flex-1 overflow-auto px-8 py-8 space-y-10 text-sm text-gray-300">
        <Hero
          name={name}
          hasGithub={hasGithub}
          isFetchingRepos={isFetchingRepos}
          onTriggerLocalImport={onTriggerLocalImport}
          onRefreshRepos={onRefreshRepos}
          onConnectGithub={onConnectGithub}
          userResolved={userResolved}
        />
        <LocalSection entries={localEntries} onTriggerLocalImport={onTriggerLocalImport} onSelectWorkspace={onSelectWorkspace} />
        <GithubSection
          hasGithub={hasGithub}
          userResolved={userResolved}
          githubError={githubError}
          isFetchingRepos={isFetchingRepos}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          entries={githubEntries}
          filteredCount={filteredGithubWorkspaces.length}
          hasQuery={hasQuery}
          onSelectWorkspace={onSelectWorkspace}
          onRefreshRepos={onRefreshRepos}
        />
      </div>
    </div>
  );
};

export default WelcomePanel;

function PanelHeader() {
  return (
    <div className="h-11 border-b border-[#262628] flex items-center justify-between px-6 text-sm text-gray-400">
      <span className="text-gray-200 font-medium">Dashboard</span>
      <span className="text-[11px] text-gray-500">AVACX</span>
    </div>
  );
}

type HeroProps = Pick<WelcomePanelProps, "name" | "hasGithub" | "isFetchingRepos" | "onTriggerLocalImport" | "onRefreshRepos" | "onConnectGithub" | "userResolved">;

function Hero({ name, hasGithub, isFetchingRepos, onTriggerLocalImport, onRefreshRepos, onConnectGithub, userResolved }: HeroProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Hello, {name}!</h2>
      <p className="text-sm text-gray-400 max-w-2xl">
        Import a local project or pull one of your GitHub repositories to populate the Explorer. Your layout preferences stay in sync between visits.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTriggerLocalImport}
          className="inline-flex items-center gap-2 rounded border border-[#2f2f31] bg-[#202022] px-4 py-2 text-xs hover:border-[#3a3a3d] hover:bg-[#26262a] transition cursor-pointer"
        >
          <FolderPlus size={14} />
          Import local folder
        </button>
        {hasGithub ? (
          <button
            type="button"
            onClick={onRefreshRepos}
            disabled={isFetchingRepos}
            className="inline-flex items-center gap-2 rounded border border-[#2f2f31] bg-[#202022] px-4 py-2 text-xs hover:border-[#3a3a3d] hover:bg-[#26262a] transition disabled:opacity-60 cursor-pointer"
          >
            {isFetchingRepos ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            {isFetchingRepos ? "Refreshing..." : "Refresh GitHub repos"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnectGithub}
            className="inline-flex items-center gap-2 rounded border border-[#2f2f31] bg-[#202022] px-4 py-2 text-xs hover:border-[#3a3a3d] hover:bg-[#26262a] transition"
          >
            <Github size={14} />
            Connect GitHub
          </button>
        )}
      </div>
      {!hasGithub && userResolved && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <AlertCircle size={14} />
          Link your GitHub account from Account Settings to browse repositories here.
        </div>
      )}
    </section>
  );
}

type LocalSectionProps = {
  entries: WelcomePanelProps["localWorkspaces"];
  onTriggerLocalImport: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
};

function LocalSection({ entries, onTriggerLocalImport, onSelectWorkspace }: LocalSectionProps) {
  const hasEntries = entries.length > 0;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Local folders</h3>
        {hasEntries && (
          <button
            type="button"
            onClick={onTriggerLocalImport}
            className="text-xs text-[#63a4ff] hover:text-[#8abaff] transition"
          >
            Add another
          </button>
        )}
      </div>
      {hasEntries ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => onSelectWorkspace(workspace.id)}
              className="group flex flex-col items-start gap-2 rounded border border-[#2f2f31] bg-[#202022] px-4 py-3 text-left transition hover:border-[#3a3a3d] hover:bg-[#26262a]"
            >
              <div className="flex w-full items-center justify-between text-sm text-white">
                <span className="font-medium">{workspace.name}</span>
                <span className="text-xs text-gray-500">{workspace.summary}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock size={12} />
                Imported {formatRelativeTime(workspace.metadata.importedAt)}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-[#2f2f31] bg-[#1f1f22] px-4 py-6 text-xs text-gray-400">
          Import a folder from your machine to create a local workspace.
        </div>
      )}
    </section>
  );
}

type GithubSectionProps = {
  hasGithub: boolean;
  userResolved: boolean;
  githubError: string | null;
  isFetchingRepos: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  entries: WelcomePanelProps["githubWorkspaces"];
  filteredCount: number;
  hasQuery: boolean;
  onSelectWorkspace: (workspaceId: string) => void;
  onRefreshRepos: () => void;
};

function GithubSection({
  hasGithub,
  userResolved,
  githubError,
  isFetchingRepos,
  searchQuery,
  setSearchQuery,
  entries,
  filteredCount,
  hasQuery,
  onSelectWorkspace,
  onRefreshRepos,
}: GithubSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">GitHub repositories</h3>
        {hasGithub && (
          <button
            type="button"
            onClick={onRefreshRepos}
            className="inline-flex items-center gap-2 text-xs text-[#63a4ff] hover:text-[#8abaff] transition"
            disabled={isFetchingRepos}
          >
            <RefreshCcw size={12} className={isFetchingRepos ? "animate-spin" : ""} />
            Refresh
          </button>
        )}
      </div>

      {!userResolved ? (
        <InlineNotice icon={<Loader2 size={14} className="animate-spin" />} text="Loading account details..." />
      ) : !hasGithub ? (
        <BorderCard text="Link your GitHub account to pull repositories into the Explorer." />
      ) : githubError ? (
        <DangerCard icon={<AlertCircle size={14} />} text={githubError} />
      ) : isFetchingRepos ? (
        <InlineNotice icon={<Loader2 size={14} className="animate-spin" />} text="Fetching repositories..." />
      ) : (
        <>
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
          <GithubGrid entries={entries} hasQuery={hasQuery} onSelectWorkspace={onSelectWorkspace} />
          {hasQuery && filteredCount > entries.length ? (
            <p className="text-[11px] text-gray-500">
              Showing first {entries.length} matches. Refine your search to narrow the results.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex items-center">
      <Search size={14} className="absolute left-3 text-gray-600" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search repositories"
        className="w-full rounded border border-[#2f2f31] bg-[#111113] py-2 pl-8 pr-3 text-xs text-gray-300 placeholder:text-gray-600 focus:border-[#3a3a3d] focus:outline-none"
      />
    </div>
  );
}

type GithubGridProps = {
  entries: WelcomePanelProps["githubWorkspaces"];
  hasQuery: boolean;
  onSelectWorkspace: (workspaceId: string) => void;
};

function GithubGrid({ entries, hasQuery, onSelectWorkspace }: GithubGridProps) {
  if (entries.length === 0) {
    return (
      <BorderCard
        text={hasQuery ? "No repositories match your search." : "No repositories found. Try refreshing if you recently created a repo."}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((workspace) => {
        const repo = workspace.metadata.repo;
        return (
          <article key={workspace.id} className="flex flex-col gap-3 rounded border border-[#2f2f31] bg-[#202022] p-4">
            <header className="flex items-center justify-between text-sm text-white">
              <span className="font-semibold">{workspace.name}</span>
              {repo.private ? <span className="text-[10px] rounded bg-[#2c1f31] px-2 py-0.5 text-[#f472b6]">Private</span> : null}
            </header>
            <div className="mt-1 text-xs text-gray-500">
              {(repo.owner?.login ?? "Unknown owner")} / {workspace.metadata.branch}
            </div>
            <p className="text-xs text-gray-400 min-h-[3rem] overflow-hidden">{repo.description || "No description provided."}</p>
            <div className="flex-1" />
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {repo.updated_at ? `Updated ${formatRelativeTime(repo.updated_at)}` : "No activity"}
              </span>
              {repo.language ? <span>{repo.language}</span> : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectWorkspace(workspace.id)}
                className="inline-flex items-center gap-2 rounded border border-[#2f2f31] bg-[#1b1b1d] px-3 py-1 text-xs hover:border-[#3a3a3d] hover:bg-[#242426] transition cursor-pointer"
              >
                {workspace.opened ? "Open workspace" : "Open"}
              </button>
              <Link
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#63a4ff] hover:text-[#8abaff] transition"
              >
                <ExternalLink size={12} />
                GitHub
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function BorderCard({ text }: { text: string }) {
  return <div className="rounded border border-[#2f2f31] bg-[#202022] px-4 py-6 text-xs text-gray-400">{text}</div>;
}

function InlineNotice({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      {icon}
      {text}
    </div>
  );
}

function DangerCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-[#3f2d2d] bg-[#291f1f] px-4 py-3 text-xs text-red-300">
      {icon}
      {text}
    </div>
  );
}
