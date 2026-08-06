"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Settings, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useBimpePanel } from "@/lib/bimpePanelState";
import { useCompanyConfig } from "@/lib/companyConfig";
import { ROLE_LABELS } from "@/lib/types";
import { getVisibleModules, findActiveModule } from "@/lib/navModules";
import { initials } from "@/lib/initials";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * Mobile's only persistent nav chrome (there is no bottom tab bar — this bar
 * covers all of it): a menu button (left) opens the full module list, the
 * current module's name sits next to it, and Bimpe + the account menu
 * (profile/settings/logout) are fixed top-right on every page.
 */
export function MobileTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toggle: toggleBimpe } = useBimpePanel();
  const { name: companyName, productionEnabled, siteOperationsEnabled } = useCompanyConfig();
  const [menuOpen, setMenuOpen] = useState(false);

  const modules = getVisibleModules({ productionEnabled, siteOperationsEnabled, role: user?.role });
  const activeModule = findActiveModule(modules, pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background px-3 py-2 md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-foreground transition-colors active:bg-accent"
        >
          <Menu className="size-4.5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{activeModule?.label ?? (companyName || "Pinta")}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={toggleBimpe}
          aria-label="Open Bimpe"
          className="flex size-9 items-center justify-center rounded-md border bg-muted/50 text-foreground transition-colors active:bg-accent"
        >
          <Sparkles className="size-4.5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="flex items-center gap-1 rounded-full border bg-muted/50 p-1 transition-colors active:bg-accent"
          >
            <Avatar size="sm">
              <AvatarFallback>{user ? initials(user.name) : "?"}</AvatarFallback>
            </Avatar>
            <ChevronDown className="mr-0.5 size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {user?.name}
              {user ? ` — ${ROLE_LABELS[user.role]}` : ""}
            </div>
            {user?.role === "OWNER_ADMIN" && (
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="size-3.5" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>{companyName || "Pinta"}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3">
            {modules.map((mod) => {
              const active = mod.exact ? pathname === mod.href : pathname?.startsWith(mod.href);
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-muted text-foreground" : "text-muted-foreground active:bg-accent",
                  )}
                >
                  <mod.icon className="size-4.5" />
                  {mod.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
