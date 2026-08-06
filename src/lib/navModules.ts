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
export const SITE_OPERATIONS_MODULE: NavModule = { href: "/site-operations", label: "Site Operations", icon: ClipboardList, exact: false };

// Financial Intelligence is more sensitive than operational spend — only shown to the
// roles who can actually see it server-side (matches the RBAC in budget.ts/invoice.ts/financial.ts).
export const FINANCIAL_MODULE: NavModule = { href: "/financial", label: "Financial", icon: Landmark, exact: false };
export const FINANCIAL_ROLES: Role[] = ["OWNER_ADMIN", "VIEWER"];

/** Single source of truth for "which modules exist for this company/role" — used by the desktop nav, the mobile top bar's full menu, and anywhere else that needs the complete list. */
export function getVisibleModules(opts: {
  productionEnabled: boolean;
  siteOperationsEnabled: boolean;
  role?: Role;
}): NavModule[] {
  return [
    DASHBOARD_MODULE,
    MATERIALS_MODULE,
    ...(opts.siteOperationsEnabled ? [SITE_OPERATIONS_MODULE] : []),
    ...(opts.productionEnabled ? [PRODUCTION_MODULE] : []),
    PROCUREMENT_MODULE,
    ASSETS_MODULE,
    ...(opts.role && FINANCIAL_ROLES.includes(opts.role) ? [FINANCIAL_MODULE] : []),
  ];
}

/** Which module the current pathname belongs to — longest-href match wins so nested routes (e.g. /production/sites) resolve to the right parent module. */
export function findActiveModule(modules: NavModule[], pathname: string | null | undefined): NavModule | undefined {
  if (!pathname) return undefined;
  return [...modules]
    .sort((a, b) => b.href.length - a.href.length)
    .find((m) => (m.exact ? pathname === m.href : pathname.startsWith(m.href)));
}
