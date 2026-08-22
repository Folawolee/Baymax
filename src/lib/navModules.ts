import { LayoutDashboard, Boxes, Factory, ClipboardList, ShoppingCart, Wrench, Landmark, type LucideIcon } from "lucide-react";
import type { Role } from "./types";

export interface NavModule {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
}

export const DASHBOARD_MODULE: NavModule = { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true };
export const MATERIALS_MODULE: NavModule = { href: "/materials", label: "Materials", icon: Boxes, exact: false };
export const PROCUREMENT_MODULE: NavModule = { href: "/procurement", label: "Procurement", icon: ShoppingCart, exact: false };
export const ASSETS_MODULE: NavModule = { href: "/assets", label: "Assets", icon: Wrench, exact: false };
export const PRODUCTION_MODULE: NavModule = { href: "/production", label: "Production", icon: Factory, exact: false };
export const SITE_OPERATIONS_MODULE: NavModule = { href: "/site-operations", label: "Projects", icon: ClipboardList, exact: false };

// Financial Intelligence is more sensitive than operational spend — only shown to the
// roles who can actually see it server-side (matches the RBAC in budget.ts/invoice.ts/financial.ts).
export const FINANCIAL_MODULE: NavModule = { href: "/financial", label: "Finance", icon: Landmark, exact: false };
export const FINANCIAL_ROLES: Role[] = ["OWNER_ADMIN", "FINANCE", "VIEWER"];

/**
 * Primary navigation is deliberately five items: Overview, Projects, Materials,
 * Finance, Production. Procurement and Assets are real modules but reached
 * contextually (from a road, a facility, or Finance) rather than competing for
 * top-level space — see getSecondaryModules.
 */
export function getVisibleModules(opts: {
  productionEnabled: boolean;
  siteOperationsEnabled: boolean;
  role?: Role;
}): NavModule[] {
  return [
    DASHBOARD_MODULE,
    ...(opts.siteOperationsEnabled ? [SITE_OPERATIONS_MODULE] : []),
    MATERIALS_MODULE,
    ...(opts.role && FINANCIAL_ROLES.includes(opts.role) ? [FINANCIAL_MODULE] : []),
    ...(opts.productionEnabled ? [PRODUCTION_MODULE] : []),
  ];
}

/** Modules that exist but are not primary nav — surfaced in the full/mobile menu. */
export function getSecondaryModules(): NavModule[] {
  return [PROCUREMENT_MODULE, ASSETS_MODULE];
}

/** Which module the current pathname belongs to — longest-href match wins so nested routes (e.g. /production/sites) resolve to the right parent module. */
export function findActiveModule(modules: NavModule[], pathname: string | null | undefined): NavModule | undefined {
  if (!pathname) return undefined;
  return [...modules]
    .sort((a, b) => b.href.length - a.href.length)
    .find((m) => (m.exact ? pathname === m.href : pathname.startsWith(m.href)));
}
