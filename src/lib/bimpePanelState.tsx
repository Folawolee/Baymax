"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface BimpePanelValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const BimpePanelContext = createContext<BimpePanelValue | null>(null);

/** Bimpe is a persistent element, not a page (UI spec §8) — one shared open/close state for the nav trigger, the mobile tab, and the panel itself. */
export function BimpePanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
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
