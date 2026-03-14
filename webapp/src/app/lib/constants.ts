export const STORAGE_KEYS = {
  activeTab: "avacx.dashboard.active-tab",
  sidebarWidth: "avacx.dashboard.sidebar-width",
  sidebarCollapsed: "avacx.dashboard.sidebar-collapsed",
  terminalOpen: "avacx.dashboard.terminal-open",
  terminalHeight: "avacx.dashboard.terminal-height",
  snipPaths: "avacx.dashboard.snip-paths",
  selectedWorkspace: "avacx.dashboard.selected-workspace",
} as const;

export const LOCAL_WORKSPACES_KEY = "avacx.dashboard.local-workspaces";
export const GITHUB_WORKSPACES_KEY = "avacx.dashboard.github-workspaces";
export const LOCAL_FILECACHE_PREFIX = "avacx.dashboard.local-filecache";

export const ACTIVITY_BAR_WIDTH = 48;
export const DEFAULT_SIDEBAR_WIDTH = 280;
export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 420;
export const MIN_TERMINAL_HEIGHT = 160;
export const DEFAULT_TERMINAL_HEIGHT = 220;

// Start with a clean terminal; prompt will be shown when user types.
export const defaultTerminalLines: string[] = [];
