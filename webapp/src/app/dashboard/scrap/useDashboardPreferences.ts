import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_TERMINAL_HEIGHT,
  MIN_SIDEBAR_WIDTH,
  MIN_TERMINAL_HEIGHT,
  STORAGE_KEYS,
  defaultTerminalLines,
} from "../../lib/constants";
import {
  isBrowser,
  loadStoredActiveTab,
  loadStoredSidebarCollapsed,
  loadStoredSidebarWidth,
  loadStoredTerminalHeight,
  loadStoredTerminalOpen,
} from "../../lib/utils";
import { ViewTab } from "../../types/gitwork.types";

type DashboardPreferencesOptions = {
  displayName: string;
};

export const useDashboardPreferences = ({ displayName }: DashboardPreferencesOptions) => {
  const [activeTab, setActiveTab] = useState<ViewTab>("explorer");
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_SIDEBAR_WIDTH);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(true);
  const [terminalSuppressed, setTerminalSuppressed] = useState<boolean>(false);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState<boolean>(false);
  const [terminalHeight, setTerminalHeight] = useState<number>(DEFAULT_TERMINAL_HEIGHT);
  const [prefsReady, setPrefsReady] = useState(false);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [terminalLines, setTerminalLines] = useState<string[]>(defaultTerminalLines);

  const layoutRef = useRef<HTMLDivElement | null>(null);
  const draggingTerminal = useRef(false);
  const sidebarSnapshotRef = useRef(Math.max(sidebarWidth, MIN_SIDEBAR_WIDTH));

  useEffect(() => {
    if (!isBrowser()) return;
    const storedActiveTab = loadStoredActiveTab();
    const storedSidebarWidth = loadStoredSidebarWidth();
    const storedSidebarCollapsed = loadStoredSidebarCollapsed();
    const storedTerminalOpen = loadStoredTerminalOpen();
    const storedTerminalHeight = loadStoredTerminalHeight();
    queueMicrotask(() => {
      setActiveTab(storedActiveTab);
      setSidebarWidth(storedSidebarWidth);
      setIsSidebarCollapsed(storedSidebarCollapsed);
      setIsTerminalOpen(storedTerminalOpen);
      setTerminalHeight(storedTerminalHeight);
      setPrefsReady(true);
    });
  }, []);

  const handleTerminalToggle = useCallback(() => {
    setIsTerminalOpen((prev) => {
      const next = !prev;
      if (next) {
        setTerminalSuppressed(false);
        if (terminalHeight < MIN_TERMINAL_HEIGHT) {
          setTerminalHeight(MIN_TERMINAL_HEIGHT);
        }
        if (activeTab !== "explorer") {
          setActiveTab("explorer");
          setIsSidebarCollapsed(false);
        }
      }
      return next;
    });
  }, [activeTab, terminalHeight]);

  const onTerminalDragStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.button !== 0) return;
    draggingTerminal.current = true;
    setIsDraggingTerminal(true);
    document.body.style.cursor = "row-resize";
  }, []);

  const handleTerminalInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const value = terminalInput.trim();
        if (!value) return;
        setTerminalLines((previous) => [...previous, `${displayName}@avacx:~$ ${value}`]);
        setTerminalInput("");
      }
    },
    [displayName, terminalInput]
  );

  const prefsWritable = prefsReady && isBrowser();

  useEffect(() => {
    if (!prefsWritable) return;
    window.localStorage.setItem(STORAGE_KEYS.activeTab, activeTab);
    window.localStorage.setItem(STORAGE_KEYS.sidebarWidth, String(sidebarWidth));
    window.localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(isSidebarCollapsed));
    window.localStorage.setItem(STORAGE_KEYS.terminalOpen, String(isTerminalOpen));
    window.localStorage.setItem(STORAGE_KEYS.terminalHeight, String(terminalHeight));
  }, [activeTab, prefsWritable, sidebarWidth, isSidebarCollapsed, isTerminalOpen, terminalHeight]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (draggingTerminal.current && layoutRef.current) {
        const rect = layoutRef.current.getBoundingClientRect();
        const availableHeight = rect.height - 80;
        const offset = rect.bottom - event.clientY;
        const nextHeight = Math.min(Math.max(offset, 0), availableHeight);

        if (nextHeight < MIN_TERMINAL_HEIGHT * 0.5) {
          setIsTerminalOpen(false);
          draggingTerminal.current = false;
          document.body.style.cursor = "";
          return;
        }

        setIsTerminalOpen(true);
        setTerminalHeight(Math.max(nextHeight, MIN_TERMINAL_HEIGHT));
      }
    };

    const handleMouseUp = () => {
      if (draggingTerminal.current) {
        draggingTerminal.current = false;
        document.body.style.cursor = "";
        setIsDraggingTerminal(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return {
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
    setTerminalHeight,
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
  };
};
