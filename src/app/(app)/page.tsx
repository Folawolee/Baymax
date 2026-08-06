"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { StatusBadge, type Status } from "@/components/data/StatusBadge";
import { EmptyState } from "@/components/data/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { useCompanyConfig } from "@/lib/companyConfig";
import { useAuth } from "@/lib/auth";
import { NotificationPopups } from "@/components/dashboard/NotificationPopups";
import { NetFlowChart } from "@/components/charts/NetFlowChart";
import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatQty } from "@/lib/format";

const ACCENT_CLASSES: Record<Status, string> = {
  good: "text-status-good",
  warn: "text-status-warn",
  bad: "text-status-bad",
  neutral: "text-foreground",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const FINANCIAL_ROLES = ["OWNER_ADMIN", "VIEWER"];

export default function HomePage() {
  const { user } = useAuth();
  const { name: companyName, productionEnabled } = useCompanyConfig();
  const canSeeFinancials = !!user && FINANCIAL_ROLES.includes(user.role);
  const showQuickActions = user?.role !== "VIEWER";

  const { data: summary, isLoading: loadingSummary } = trpc.dashboard.summary.useQuery();
  const { data: sites, isLoading: loadingSites } = trpc.site.list.useQuery();
  const { data: productionStatus } = trpc.production.statusForAllSites.useQuery(undefined, { enabled: productionEnabled });
  const { data: costToComplete } = trpc.budget.listCostToCompleteForAllSites.useQuery(undefined, { enabled: canSeeFinancials });
  const { data: allOrders } = trpc.productionOrder.listByCompany.useQuery(undefined, { enabled: productionEnabled });
  const { data: cashFlow } = trpc.financial.cashFlowProjection.useQuery({ weeks: 8 }, { enabled: canSeeFinancials });

  const statusBySite = new Map((productionStatus ?? []).map(({ site, status }) => [site.id, status]));
  const costBySite = new Map((costToComplete ?? []).map(({ site, costToComplete: c }) => [site.id, c]));

  type OrderEntry = NonNullable<typeof allOrders>[number];
  const ordersBySite = new Map<string, OrderEntry[]>();
  for (const entry of allOrders ?? []) {
    const list = ordersBySite.get(entry.order.siteId) ?? [];
    list.push(entry);
    ordersBySite.set(entry.order.siteId, list);
  }
  const activeOrders = (allOrders ?? []).filter(
    ({ progress }) => progress.status === "OPEN" || progress.status === "IN_PROGRESS",
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <NotificationPopups />

      <div>
        <h1 className="font-heading text-lg font-semibold">
          {greeting()}
          {user ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {companyName ? `${companyName} · ` : ""}
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="rounded-md border bg-muted/30 p-4">
        <p className="text-sm">{loadingSummary ? "Putting together today's update…" : summary?.text}</p>
      </div>

      {summary && summary.highlights.length > 0 && (
        <div className={cn("grid gap-3", summary.highlights.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
          {summary.highlights.map((h) => (
            <div key={h.id} className="flex flex-col gap-1 rounded-md border p-5">
              <p className="text-sm text-muted-foreground">{h.label}</p>
              <p className={cn("font-heading text-3xl font-semibold", ACCENT_CLASSES[h.accent ?? "neutral"])}>{h.value}</p>
              {h.sublabel && <p className="text-xs text-muted-foreground">{h.sublabel}</p>}
            </div>
          ))}
        </div>
      )}

      {showQuickActions && (
        <div className="flex flex-wrap gap-2">
          <Link href="/site-operations/log" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Log site usage
          </Link>
          {productionEnabled && (
            <Link href="/production" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Log production
            </Link>
          )}
          <Link href="/procurement" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Create purchase order
          </Link>
          <Link href="/assets" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Log maintenance
          </Link>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Ongoing projects</p>
        {loadingSites ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !sites || sites.length === 0 ? (
          <EmptyState title="No sites yet" description="Sites your company works across will show up here." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => {
              const status = statusBySite.get(site.id);
              const cost = costBySite.get(site.id);
              const showBudgetBar = cost && cost.budgetAmount !== null;
              const siteOrders = ordersBySite.get(site.id) ?? [];
              const inProgressOrders = siteOrders.filter(
                ({ progress }) => progress.status === "OPEN" || progress.status === "IN_PROGRESS",
              );
              const avgFulfilled =
                inProgressOrders.length > 0
                  ? inProgressOrders.reduce((sum, { progress }) => sum + progress.percentComplete, 0) / inProgressOrders.length
                  : null;
              return (
                <Link
                  key={site.id}
                  href={productionEnabled ? `/production/${site.id}` : `/site-operations/${site.id}`}
                  className="flex flex-col gap-2 rounded-md border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{site.name}</p>
                    {productionEnabled && status?.hasPlan && (
                      <StatusBadge status={status.isBehindPlan ? "bad" : "good"} label={status.isBehindPlan ? "Behind plan" : "On track"} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{site.typeLabel}</p>

                  {avgFulfilled !== null && (
                    <p className="text-xs text-muted-foreground">
                      {inProgressOrders.length} order{inProgressOrders.length === 1 ? "" : "s"} in progress · {avgFulfilled.toFixed(0)}% avg. fulfilled
                    </p>
                  )}

                  {showBudgetBar && (
                    <div className="mt-1">
                      <p className="text-sm font-medium">
                        Spent {formatCompactCurrency(cost!.committedSpend)}
                        <span className="font-normal text-muted-foreground"> of {formatCompactCurrency(cost!.budgetAmount ?? 0)} budgeted</span>
                      </p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full", (cost!.percentUsed ?? 0) > 100 ? "bg-status-bad" : "bg-status-good")}
                          style={{ width: `${Math.min(cost!.percentUsed ?? 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {productionEnabled && activeOrders.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Active orders</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.map(({ order, progress }) => (
              <Link
                key={order.id}
                href={`/production/orders/${order.id}`}
                className="flex flex-col gap-2 rounded-md border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{order.customer?.name ?? "No customer on file"}</p>
                  <StatusBadge
                    status={progress.status === "IN_PROGRESS" ? "warn" : "neutral"}
                    label={progress.status === "IN_PROGRESS" ? "In progress" : "Not started"}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{order.productLabel}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-status-warn" style={{ width: `${Math.min(progress.percentComplete, 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatQty(progress.producedKg / 1000, "t")} of {formatQty(progress.targetKg / 1000, "t")} produced
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {canSeeFinancials && cashFlow && cashFlow.length > 0 && (
        <div className="rounded-md border p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Cash flow — next 8 weeks</p>
          <NetFlowChart buckets={cashFlow} formatValue={(n) => formatCompactCurrency(n)} />
        </div>
      )}
    </div>
  );
}
