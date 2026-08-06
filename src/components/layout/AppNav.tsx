"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, ChevronDown, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useBimpePanel } from "@/lib/bimpePanelState";
import { useCompanyConfig } from "@/lib/companyConfig";
import { useNavHistory } from "@/lib/navHistory";
import { ROLE_LABELS } from "@/lib/types";
import { getVisibleModules } from "@/lib/navModules";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";

/** Desktop persistent nav: brand, centered modules, back/forward (only when usable) + Bimpe + user menu. */
export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toggle: toggleBimpe } = useBimpePanel();
  const { name: companyName, productionEnabled, siteOperationsEnabled } = useCompanyConfig();
  const { canGoBack, canGoForward, goBack, goForward } = useNavHistory();

  const orderedModules = getVisibleModules({ productionEnabled, siteOperationsEnabled, role: user?.role });

  return (
    <nav className="sticky top-0 z-30 hidden grid-cols-[auto_1fr_auto] items-center gap-4 border-b bg-background px-4 py-2 md:grid">
      <div className="flex items-center">
        <Link href="/" className="truncate font-heading text-base font-semibold">
          {companyName || "Pinta"}
        </Link>
      </div>

      <div className="flex items-center justify-center gap-1">
        {orderedModules.map((mod) => {
          const active = mod.exact ? pathname === mod.href : pathname?.startsWith(mod.href);
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
          onClick={toggleBimpe}
          className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Sparkles className="size-4" />
          Bimpe
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="flex items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-1 pr-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Avatar size="sm">
              <AvatarFallback>{user ? initials(user.name) : "?"}</AvatarFallback>
            </Avatar>
            {user?.name}
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{user && ROLE_LABELS[user.role]}</div>
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
    </nav>
  );
}
