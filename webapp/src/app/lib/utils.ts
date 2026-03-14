import {
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_TERMINAL_HEIGHT,
  LOCAL_WORKSPACES_KEY,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MIN_TERMINAL_HEIGHT,
  STORAGE_KEYS,
} from "@/app/lib/constants";
import { ExplorerNode, GitHubTreeItem } from "@/app/types/gitwork.types";

export const isBrowser = () => typeof window !== "undefined";

export const loadStoredActiveTab = (): "explorer" | "toolbox" | "history" => {
  if (!isBrowser()) return "explorer";
  const stored = window.localStorage.getItem(STORAGE_KEYS.activeTab) as
    | "explorer"
    | "toolbox"
    | "cuboid" // backward-compat
    | "control" // backward-compat
    | "history"
    | null;
  // Migrate legacy value 'cuboid' to 'toolbox'
  if (stored === "cuboid") return "toolbox";
  // Migrate legacy value 'control' to 'history'
  if (stored === "control") return "history";
  if (stored === "explorer" || stored === "toolbox" || stored === "history") {
    return stored;
  }
  return "explorer";
};

export const loadStoredSidebarWidth = (): number => {
  if (!isBrowser()) return DEFAULT_SIDEBAR_WIDTH;
  const stored = window.localStorage.getItem(STORAGE_KEYS.sidebarWidth);
  const parsed = stored ? parseInt(stored, 10) : Number.NaN;
  if (!Number.isNaN(parsed)) {
    return Math.min(Math.max(parsed, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
  }
  return DEFAULT_SIDEBAR_WIDTH;
};

export const loadStoredSidebarCollapsed = (): boolean => {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "true";
};

export const loadStoredTerminalOpen = (): boolean => {
  if (!isBrowser()) return true;
  return window.localStorage.getItem(STORAGE_KEYS.terminalOpen) !== "false";
};

export const loadStoredTerminalHeight = (): number => {
  if (!isBrowser()) return DEFAULT_TERMINAL_HEIGHT;
  const stored = window.localStorage.getItem(STORAGE_KEYS.terminalHeight);
  const parsed = stored ? parseInt(stored, 10) : Number.NaN;
  if (!Number.isNaN(parsed)) {
    return Math.max(parsed, MIN_TERMINAL_HEIGHT);
  }
  return DEFAULT_TERMINAL_HEIGHT;
};

export const loadStoredSnipPaths = (): Record<string, string> => {
  if (!isBrowser()) return {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.snipPaths);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, string>;
    if (parsed && typeof parsed === "object") {
      const entries = Object.entries(parsed).filter(([key, value]) => typeof key === "string" && typeof value === "string");
      return Object.fromEntries(entries);
    }
  } catch {
    return {};
  }
  return {};
};

export const persistSnipPaths = (paths: Record<string, string>) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.snipPaths, JSON.stringify(paths));
  } catch {
    // noop: localStorage may be unavailable
  }
};

// Internal mutable node for building the explorer tree efficiently
type MutableExplorerNode = {
  name: string;
  type: "folder" | "file";
  children?: Map<string, MutableExplorerNode>;
};

const createFolderNode = (name: string): MutableExplorerNode => ({
  name,
  type: "folder",
  children: new Map(),
});

const insertPath = (
  root: MutableExplorerNode,
  segments: string[],
  finalType: "folder" | "file"
) => {
  if (segments.length === 0) return;
  let current = root;

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const expectedType = isLast ? finalType : "folder";

    if (!current.children) {
      current.children = new Map();
    }

    let child = current.children.get(segment);
    if (!child) {
      child = (expectedType === "folder"
        ? createFolderNode(segment)
        : { name: segment, type: "file" }) as MutableExplorerNode;
      current.children.set(segment, child);
    } else if (!isLast && child.type === "file") {
      child.type = "folder";
      child.children = child.children ?? new Map();
    }

    if (isLast) {
      if (expectedType === "file") {
        child.type = "file";
        delete child.children;
      } else if (child.type === "file") {
        child.type = "folder";
        child.children = child.children ?? new Map();
      }
    }

    current = child;
  });
};

const sortChildren = (children: Map<string, MutableExplorerNode>): MutableExplorerNode[] => {
  return Array.from(children.values()).sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === "folder" ? -1 : 1;
  });
};

const convertMutableNode = (node: MutableExplorerNode): ExplorerNode => {
  if (node.type === "file") {
    return { name: node.name, type: "file" };
  }
  const sortedChildren = node.children ? sortChildren(node.children).map(convertMutableNode) : [];
  return sortedChildren.length > 0
    ? { name: node.name, type: "folder", children: sortedChildren }
    : { name: node.name, type: "folder" };
};

export const buildTreeFromFlatPaths = (
  rootName: string,
  items: Array<{ path: string; type: "folder" | "file" }>
): ExplorerNode[] => {
  const root = createFolderNode(rootName);
  items.forEach(({ path, type }) => {
    const cleaned = path.replace(/^\/+/, "").replace(/\/+$/g, "");
    if (!cleaned) return;
    const segments = cleaned.split("/").filter(Boolean);
    insertPath(root, segments, type);
  });
  return [convertMutableNode(root)];
};

export const buildTreeFromGitHub = (repoName: string, tree: GitHubTreeItem[]): ExplorerNode[] => {
  const entries: Array<{ path: string; type: "folder" | "file" }> = tree.map((item) => ({
    path: item.path,
    type: item.type === "tree" ? "folder" : "file",
  }));
  return buildTreeFromFlatPaths(repoName, entries);
};

export const countFilesInNodes = (nodes: ExplorerNode[]): number => {
  return nodes.reduce((total, node) => {
    if (node.type === "file") return total + 1;
    if (!node.children) return total;
    return total + countFilesInNodes(node.children);
  }, 0);
};

export const formatRelativeTime = (iso: string | null | undefined) => {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diff = date.getTime() - Date.now();
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms || unit === "minute") {
      const value = Math.round(diff / ms);
      return rtf.format(value, unit);
    }
  }
  return "just now";
};

export const formatAbsoluteTimestamp = (iso: string) => {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

// Re-export frequently used keys for convenience
export { LOCAL_WORKSPACES_KEY };

// -------- Simple code highlighting (TS/JS-ish) --------
const KEYWORDS = new Set(
  [
    'const','let','var','function','return','if','else','for','while','switch','case','break','continue','class','extends','implements','interface','type','import','from','export','default','new','try','catch','finally','throw','await','async','yield','public','private','protected','readonly','static','enum','namespace','declare','as','in','of','instanceof','typeof','void','null','undefined','true','false',
    // Go, Rust, Python basics
    'package','go','defer','map','chan','struct','fmt','print','range','match','fn','let','mut','impl','pub','use','mod','trait','where','def','lambda','with','pass','raise','yield','nonlocal','global'
  ]
);

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlightCode(source: string): string {
  // Lightweight scanner to avoid nested replacements
  const s = source;
  let i = 0;
  const n = s.length;
  let out = '';

  const wrap = (cls: string, text: string) => `<span class="${cls}">${text}</span>`;
  const color = {
    comment: 'text-[#5c6370]',
    string: 'text-[#ecc48d]',
    keyword: 'text-[#c792ea]',
    number: 'text-[#f78c6c]',
  } as const;

  function readWhile(test: (ch: string) => boolean) {
    const start = i;
    while (i < n && test(s[i])) i++;
    return s.slice(start, i);
  }

  while (i < n) {
    const ch = s[i];
    const next = i + 1 < n ? s[i + 1] : '';

    // Line comment // ...\n
    if (ch === '/' && next === '/') {
      const start = i;
      i += 2;
      while (i < n && s[i] !== '\n') i++;
      out += wrap(color.comment, escapeHtml(s.slice(start, i)));
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && next === '*') {
      const start = i;
      i += 2;
      while (i < n && !(s[i] === '*' && i + 1 < n && s[i + 1] === '/')) i++;
      if (i < n) i += 2;
      out += wrap(color.comment, escapeHtml(s.slice(start, i)));
      continue;
    }

    // Strings
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      const start = i;
      i++;
      while (i < n) {
        const c = s[i];
        if (c === '\\') { i += 2; continue; }
        if (c === quote) { i++; break; }
        i++;
      }
      out += wrap(color.string, escapeHtml(s.slice(start, i)));
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      const token = readWhile((c) => /[0-9eE_\.]/.test(c));
      out += wrap(color.number, escapeHtml(token));
      continue;
    }

    // Identifiers / keywords
    if (/[A-Za-z_$]/.test(ch)) {
      const ident = readWhile((c) => /[A-Za-z0-9_$]/.test(c));
      if (KEYWORDS.has(ident)) {
        out += wrap(color.keyword, escapeHtml(ident));
      } else {
        out += escapeHtml(ident);
      }
      continue;
    }

    // Default single char
    out += escapeHtml(ch);
    i++;
  }

  return out;
}
