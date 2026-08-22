"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, FileText, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useBimpePanel } from "@/lib/bimpePanelState";
import { useCompanyConfig } from "@/lib/companyConfig";
import { useNavHistory } from "@/lib/navHistory";
import { ROLE_LABELS } from "@/lib/types";
import { getVisibleModules, getSecondaryModules } from "@/lib/navModules";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { BaymaxMark } from "@/components/layout/BaymaxMark";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GenerateReportDialog } from "@/components/reports/GenerateReportDialog";

/** Desktop persistent nav: brand, centered modules, back/forward (only when usable) + Bimpe + user menu. */
export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toggle: toggleBimpe } = useBimpePanel();
  const { productionEnabled, siteOperationsEnabled } = useCompanyConfig();
  const { canGoBack, canGoForward, goBack, goForward } = useNavHistory();
  const [reportOpen, setReportOpen] = useState(false);

  const orderedModules = getVisibleModules({ productionEnabled, siteOperationsEnabled, role: user?.role });

  return (
    <nav className="sticky top-0 z-30 hidden grid-cols-[auto_1fr_auto] items-center gap-5 border-b bg-background/95 px-6 py-3 backdrop-blur md:grid">
      <div className="flex items-center">
        <Link href="/" className="flex items-center gap-2 truncate font-heading text-lg font-semibold tracking-tight"><BaymaxMark /> BAYMAX</Link>
      </div>

      <div className="flex items-center justify-center gap-1">
        {orderedModules.map((mod) => {
          const active = mod.exact ? pathname === mod.href : pathname?.startsWith(mod.href);
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                active ? "text-primary after:absolute after:inset-x-3 after:-bottom-3 after:h-0.5 after:rounded-full after:bg-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <mod.icon className="size-4" />
              {mod.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        {(canGoBack || canGoForward) && (
          <div className="flex items-center gap-1 border-r pr-2">
            {canGoBack && (
              <button
                onClick={goBack}
                aria-label="Go back"
                className="flex size-7 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            {canGoForward && (
              <button
                onClick={goForward}
                aria-label="Go forward"
                className="flex size-7 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setReportOpen(true)}
          className="hidden items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:flex"
        >
          <FileText className="size-4" />
          Generate Report
        </button>

        <button
          onClick={toggleBimpe}
          className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Sparkles className="size-4" />
          Baymax AI
        </button>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="flex items-center gap-1.5 rounded-full border bg-muted/30 py-1 pl-1 pr-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Avatar size="sm">
              <AvatarFallback>{user ? initials(user.name) : "?"}</AvatarFallback>
            </Avatar>
            {user?.name}
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{user && ROLE_LABELS[user.role]}</div>
            {getSecondaryModules().map((mod) => (
              <DropdownMenuItem key={mod.href} onClick={() => router.push(mod.href)}>
                <mod.icon className="size-3.5" />
                {mod.label}
              </DropdownMenuItem>
            ))}
            {user?.role === "OWNER_ADMIN" && (
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="size-3.5" />
                Company settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <GenerateReportDialog open={reportOpen} onOpenChange={setReportOpen} />
    </nav>
  );
}
