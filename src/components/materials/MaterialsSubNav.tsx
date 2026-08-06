"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/materials", label: "Catalog", exact: true },
  { href: "/materials/by-location", label: "By location", exact: false },
  { href: "/materials/transfer", label: "Transfer", exact: false },
  { href: "/materials/locations", label: "Locations", exact: false },
];

/** Sub-nav for the merged Materials + Inventory module — catalog, stock-by-location, and transfer are one module now. */
export function MaterialsSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
