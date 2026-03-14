"use client";
import React, { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useRightClickPopup } from "./popup/RightClick";

type ProviderProps = {
  children: React.ReactNode;
};

// Blocks casual inspection shortcuts and wires the contextual menu manager for authenticated users.
export default function Provider({ children }: ProviderProps) {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    const onKeyDown = (event: KeyboardEvent) => {
      const key = (event.key || "").toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      if (event.key === "F12") {
        event.preventDefault();
        return;
      }

      const blockedCombos = [
        ctrlOrMeta && event.shiftKey && key === "i", // devtools
        ctrlOrMeta && event.shiftKey && key === "j", // devtools
        ctrlOrMeta && !event.shiftKey && key === "u", // view source
        ctrlOrMeta && event.shiftKey && key === "c", // element inspector
      ];

      if (blockedCombos.some(Boolean)) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu, { passive: false });
    document.addEventListener("keydown", onKeyDown, { passive: false });

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <SessionProvider>
      {children}
      <RightClickManager />
    </SessionProvider>
  );
}

function RightClickManager() {
  const { status } = useSession();
  useRightClickPopup(status === "authenticated");
  return null;
}
