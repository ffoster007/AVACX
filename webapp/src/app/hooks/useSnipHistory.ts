"use client";

import { useCallback, useEffect, useState } from "react";
import { SnipHistoryEntry } from "@/app/types/SnipPriority.types";

export type AuthStatus = "authenticated" | "unauthenticated" | "loading" | undefined;

type WorkspaceHistoryMap = Record<string, SnipHistoryEntry>;

export function useSnipHistory(authStatus: AuthStatus) {
  const [snipHistoryByWorkspace, setSnipHistoryByWorkspace] = useState<WorkspaceHistoryMap>({});
  const [snipResultEntry, setSnipResultEntry] = useState<SnipHistoryEntry | null>(null);

  const reduceHistoryEntries = useCallback((entries: SnipHistoryEntry[]) => {
    return entries.reduce<WorkspaceHistoryMap>((accumulator, entry) => {
      if (!entry.workspaceId) return accumulator;
      const current = accumulator[entry.workspaceId];
      const currentTime = current ? new Date(current.triggeredAt).getTime() : 0;
      const nextTime = new Date(entry.triggeredAt).getTime();
      if (!current || nextTime > currentTime) {
        accumulator[entry.workspaceId] = entry;
      }
      return accumulator;
    }, {});
  }, []);

  const hydrateSnipHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/snip/history", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load Snip history.");
      }
      const entries = Array.isArray(payload?.history) ? (payload.history as SnipHistoryEntry[]) : [];
      const map = reduceHistoryEntries(entries);
      setSnipHistoryByWorkspace(map);
    } catch (error) {
      console.warn("[snip] Failed to hydrate history", error);
    }
  }, [reduceHistoryEntries]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    void hydrateSnipHistory();
  }, [authStatus, hydrateSnipHistory]);

  const handleHistorySync = useCallback(
    (entries: SnipHistoryEntry[]) => {
      const map = reduceHistoryEntries(entries);
      setSnipHistoryByWorkspace(map);
    },
    [reduceHistoryEntries]
  );

  const upsertHistoryEntry = useCallback((entry: SnipHistoryEntry) => {
    if (!entry.workspaceId) return;
    setSnipHistoryByWorkspace((previous) => ({ ...previous, [entry.workspaceId as string]: entry }));
  }, []);

  return {
    snipHistoryByWorkspace,
    snipResultEntry,
    setSnipResultEntry,
    handleHistorySync,
    upsertHistoryEntry,
    hydrateSnipHistory,
  };
}
