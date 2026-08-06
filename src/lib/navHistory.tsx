"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface NavHistoryValue {
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
}

const NavHistoryContext = createContext<NavHistoryValue | null>(null);

interface NavStack {
  stack: string[];
  index: number;
}

/**
 * Our own visited-path stack, independent of the raw browser history — Next's
 * router doesn't expose "can I actually go back/forward", so we track it
 * ourselves and drive navigation with router.push instead of router.back()/
 * forward(), which lets us know exactly when each direction is usable.
 */
export function NavHistoryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const traversingRef = useRef(false);
  const [nav, setNav] = useState<NavStack>({ stack: [pathname], index: 0 });

  useEffect(() => {
    if (traversingRef.current) {
      traversingRef.current = false;
      return;
    }
    setNav((prev) => {
      if (prev.stack[prev.index] === pathname) return prev;
      const newStack = prev.stack.slice(0, prev.index + 1);
      newStack.push(pathname);
      return { stack: newStack, index: newStack.length - 1 };
    });
  }, [pathname]);

  function goBack() {
    if (nav.index === 0) return;
    traversingRef.current = true;
    const newIndex = nav.index - 1;
    setNav((prev) => ({ ...prev, index: newIndex }));
    router.push(nav.stack[newIndex]);
  }

  function goForward() {
    if (nav.index === nav.stack.length - 1) return;
    traversingRef.current = true;
    const newIndex = nav.index + 1;
    setNav((prev) => ({ ...prev, index: newIndex }));
    router.push(nav.stack[newIndex]);
  }

  const value: NavHistoryValue = {
    canGoBack: nav.index > 0,
    canGoForward: nav.index < nav.stack.length - 1,
    goBack,
    goForward,
  };

  return <NavHistoryContext.Provider value={value}>{children}</NavHistoryContext.Provider>;
}

export function useNavHistory(): NavHistoryValue {
  const ctx = useContext(NavHistoryContext);
  if (!ctx) throw new Error("useNavHistory must be used within NavHistoryProvider");
  return ctx;
}
