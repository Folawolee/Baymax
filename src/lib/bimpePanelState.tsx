"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";

interface BimpePanelValue {
  isOpen: boolean;
  /** Optionally seed the panel with a command typed elsewhere (e.g. the Overview command bar). */
  open: (prompt?: string) => void;
  close: () => void;
  toggle: () => void;
  /** Reads the seeded prompt exactly once, so re-opening the panel does not resend it. */
  consumePendingPrompt: () => string | null;
}

const BimpePanelContext = createContext<BimpePanelValue | null>(null);

/** Bimpe is a persistent element, not a page (UI spec §8) — one shared open/close state for the nav trigger, the mobile tab, and the panel itself. */
export function BimpePanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pendingPrompt = useRef<string | null>(null);
  const value = useMemo(
    () => ({
      isOpen,
      open: (prompt?: string) => {
        if (prompt) pendingPrompt.current = prompt;
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      consumePendingPrompt: () => {
        const p = pendingPrompt.current;
        pendingPrompt.current = null;
        return p;
      },
    }),
    [isOpen],
  );
  return <BimpePanelContext.Provider value={value}>{children}</BimpePanelContext.Provider>;
}

export function useBimpePanel(): BimpePanelValue {
  const ctx = useContext(BimpePanelContext);
  if (!ctx) throw new Error("useBimpePanel must be used within BimpePanelProvider");
  return ctx;
}
