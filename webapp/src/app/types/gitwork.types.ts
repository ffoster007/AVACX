export type ViewTab = "explorer" | "toolbox" | "history";
export type ExplorerMode = "welcome" | "workspace";

export type ExplorerNode = {
  name: string;
  type: "folder" | "file";
  children?: ExplorerNode[];
};

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  html_url: string;
  updated_at: string | null;
  default_branch: string;
  owner: { login: string | null } | null;
};

export type GitHubTreeItem = {
  path: string;
  type: "tree" | "blob";
};

export type LocalWorkspaceMetadata = {
  importedAt: string;
  fileCount: number;
  absolutePath?: string;
};

export type GitHubWorkspaceMetadata = {
  repo: GitHubRepo;
  branch: string;
  fileCount?: number;
  syncedAt?: string;
};

export type LocalWorkspaceEntry = {
  id: string;
  name: string;
  type: "local";
  summary: string;
  tree: ExplorerNode[];
  metadata: LocalWorkspaceMetadata;
  // In-memory file map for previews (not persisted)
  files?: Record<string, File>;
};

export type GitHubWorkspaceEntry = {
  id: string;
  name: string;
  type: "github";
  summary: string;
  tree?: ExplorerNode[];
  metadata: GitHubWorkspaceMetadata;
  opened: boolean;
};

export type WorkspaceEntry = LocalWorkspaceEntry | GitHubWorkspaceEntry;

export type PersistedLocalWorkspace = {
  id: string;
  name: string;
  summary: string;
  tree: ExplorerNode[];
  metadata: LocalWorkspaceMetadata;
};

export type PersistedGitHubWorkspace = {
  id: string;
  name: string;
  summary: string;
  tree?: ExplorerNode[];
  metadata: GitHubWorkspaceMetadata;
  opened: boolean;
};

export type WelcomePanelProps = {
  name: string;
  hasGithub: boolean;
  isFetchingRepos: boolean;
  githubWorkspaces: GitHubWorkspaceEntry[];
  githubError: string | null;
  onSelectWorkspace: (id: string) => void;
  onTriggerLocalImport: () => void;
  onConnectGithub: () => void;
  onRefreshRepos: () => void;
  localWorkspaces: LocalWorkspaceEntry[];
  userResolved: boolean;
};
