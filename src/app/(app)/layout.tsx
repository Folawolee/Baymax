"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BimpePanelProvider } from "@/lib/bimpePanelState";
import { NavHistoryProvider } from "@/lib/navHistory";
import { AppNav } from "@/components/layout/AppNav";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { OfflineIndicator } from "@/components/data/OfflineIndicator";
import { BimpePanel } from "@/components/bimpe/ChatPanel";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) router.replace("/login");
  }, [isLoading, token, router]);

  if (isLoading || !token) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <NavHistoryProvider>
      <BimpePanelProvider>
        <div className="flex min-h-screen flex-col">
          <AppNav />
          <MobileTopBar />
          <OfflineIndicator />
          <main className="flex-1 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-6">{children}</main>
          <BimpePanel />
        </div>
      </BimpePanelProvider>
    </NavHistoryProvider>
  );
}
