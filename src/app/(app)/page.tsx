"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { EmptyState } from "@/components/data/EmptyState";
import { useCompanyConfig } from "@/lib/companyConfig";
import { useAuth } from "@/lib/auth";
import { useBimpePanel } from "@/lib/bimpePanelState";
import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatDate } from "@/lib/format";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { SectionHeader } from "@/components/enterprise/SectionHeader";
import { MetricBand, type MetricItem } from "@/components/enterprise/MetricBand";
import { StatusIndicator, ProgressRule, type Severity } from "@/components/enterprise/StatusIndicator";
import { DataGrid, type GridColumn } from "@/components/enterprise/DataGrid";
import { GenerateReportDialog } from "@/components/reports/GenerateReportDialog";

type Overview = RouterOutputs["dashboard"]["executiveOverview"];
type ProjectRow = Overview["projects"][number];
type ExceptionRow = Overview["exceptions"][number];
type ActivityItem = RouterOutputs["dashboard"]["recentActivity"][number];

const HEALTH: Record<ProjectRow["health"], { label: string; severity: Severity }> = {
  healthy: { label: "Healthy", severity: "good" },
  at_risk: { label: "At Risk", severity: "warn" },
  critical: { label: "Critical", severity: "bad" },
};

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v)}%`;
}

/** Schedule reads in calendar days, and only draws attention when actually behind. */
function scheduleLabel(days: number | null): { text: string; muted: boolean } {
  if (days === null) return { text: "—", muted: true };
  if (days <= 0) return { text: "On plan", muted: true };
  return { text: `+${days} day${days === 1 ? "" : "s"}`, muted: false };
}

/** Short relative time for the operations log, falling back to a date once that stops being useful. */
function relativeTime(value: Date | string): string {
  const d = new Date(value);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (d.toDateString() === new Date().toDateString()) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  if (new Date(Date.now() - 86_400_000).toDateString() === d.toDateString()) return "Yesterday";
  return formatDate(d);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { name: companyName, productionEnabled, productionUnitLabel } = useCompanyConfig();
  const { open: openBimpe } = useBimpePanel();
  const [command, setCommand] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const { data: overview, isLoading } = trpc.dashboard.executiveOverview.useQuery();
  const { data: recentActivity } = trpc.dashboard.recentActivity.useQuery();

  const kpis = overview?.kpis;
  const projects = overview?.projects ?? [];
  const exceptions = overview?.exceptions ?? [];

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function submitCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim()) return;
    // The AI panel owns execution and confirmation; this bar is the entry point.
    openBimpe(command.trim());
    setCommand("");
  }

  const metrics: MetricItem[] = [
    {
      label: "Total active budget",
      value: kpis?.totalBudget != null ? formatCompactCurrency(kpis.totalBudget) : "—",
      context: `${kpis?.activeProjectCount ?? 0} active project${kpis?.activeProjectCount === 1 ? "" : "s"}`,
    },
    {
      label: "Expenditure",
      value: kpis ? formatCompactCurrency(kpis.expenditure) : "—",
      context: kpis?.utilisationPct != null ? `${kpis.utilisationPct.toFixed(1)}% utilised` : "No budget set",
      tone: kpis?.utilisationPct != null && kpis.utilisationPct > 90 ? "warn" : "neutral",
    },
    {
      label: "Project progress",
      value: pct(kpis?.avgProgressPct ?? null),
      context:
        kpis && kpis.projectsBehind > 0
          ? `${kpis.projectsBehind} need${kpis.projectsBehind === 1 ? "s" : ""} attention`
          : "All projects on plan",
      tone: kpis && kpis.projectsBehind > 0 ? "warn" : "neutral",
    },
    {
      label: `Production (${productionUnitLabel})`,
      value: kpis ? Math.round(kpis.productionThisMonth).toLocaleString() : "—",
      context:
        kpis?.productionVsPlanPct != null
          ? `${kpis.productionVsPlanPct >= 0 ? "+" : ""}${kpis.productionVsPlanPct.toFixed(0)}% vs plan`
          : "No active plan",
      tone: kpis?.productionVsPlanPct == null ? "neutral" : kpis.productionVsPlanPct < 0 ? "warn" : "good",
    },
  ];

  const exceptionColumns: GridColumn<ExceptionRow>[] = [
    {
      key: "project",
      header: "Project",
      cell: (ex) => <StatusIndicator severity={ex.severity === "critical" ? "bad" : "warn"} label={ex.projectName} />,
    },
    { key: "issue", header: "Issue", cell: (ex) => <span className="text-sm text-muted-foreground">{ex.issue}</span> },
    {
      key: "impact",
      header: "Impact",
      cell: (ex) => <span className="text-sm tabular-nums text-muted-foreground">{ex.impact}</span>,
    },
    { key: "status", header: "Status", cell: (ex) => <span className="text-sm">{ex.status}</span> },
    {
      key: "action",
      header: "",
      numeric: true,
      cell: (ex) => (
        <Link href={ex.href} className="text-sm font-medium text-primary hover:underline">
          Review
        </Link>
      ),
    },
  ];

  const projectColumns: GridColumn<ProjectRow>[] = [
    {
      key: "project",
      header: "Project",
      cell: (p) => (
        <>
          <Link href={`/site-operations/projects/${p.id}`} className="text-sm font-medium hover:underline">
            {p.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {p.client ? `${p.client} · ` : ""}
            {p.roadCount} road{p.roadCount === 1 ? "" : "s"} · {p.locationCount} location
            {p.locationCount === 1 ? "" : "s"}
          </p>
        </>
      ),
    },
    { key: "progress", header: "Progress", className: "w-44", cell: (p) => <ProgressRule value={p.progressPct} /> },
    {
      key: "budget",
      header: "Budget used",
      cell: (p) => <span className="text-sm tabular-nums">{pct(p.budgetUsedPct)}</span>,
    },
    {
      key: "elapsed",
      header: "Time elapsed",
      secondary: true,
      cell: (p) => <span className="text-sm tabular-nums text-muted-foreground">{pct(p.elapsedPct)}</span>,
    },
    {
      key: "schedule",
      header: "Schedule",
      cell: (p) => {
        const s = scheduleLabel(p.scheduleVarianceDays);
        return (
          <span className={cn("text-sm tabular-nums", s.muted ? "text-muted-foreground" : "text-foreground")}>
            {s.text}
          </span>
        );
      },
    },
    {
      key: "health",
      header: "Health",
      cell: (p) => (
        <StatusIndicator
          severity={HEALTH[p.health].severity}
          label={HEALTH[p.health].label}
          muted={p.health === "healthy"}
        />
      ),
    },
    {
      key: "recentWork",
      header: "Recent work",
      secondary: true,
      cell: (p) =>
        p.recentWork ? (
          <>
            <span className="text-sm">{p.recentWork.title}</span>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(p.recentWork.completedAt)}</p>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "milestone",
      header: "Next milestone",
      cell: (p) =>
        p.nextMilestone ? (
          <>
            <span className="text-sm">{p.nextMilestone.title}</span>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(p.nextMilestone.dueDate)}</p>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-7">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Executive Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {today} · {companyName ? `${companyName} — ` : ""}all active projects
          </p>
        </div>
        <button
          onClick={() => setReportOpen(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <FileText className="size-4" /> Generate Report
        </button>
      </header>

      <MetricBand items={metrics} className="border-b pb-6" />

      <section>
        <SectionHeader
          title="Requires attention"
          meta={exceptions.length > 0 ? `${exceptions.length} item${exceptions.length === 1 ? "" : "s"}` : undefined}
        />
        {isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading…</p>
        ) : exceptions.length === 0 ? (
          <div className="flex items-center gap-2.5 border-y py-5 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-status-good" />
            Nothing requires attention right now.
          </div>
        ) : (
          <DataGrid columns={exceptionColumns} rows={exceptions} rowKey={(ex) => ex.id} minWidth={720} />
        )}
      </section>

      <section>
        <SectionHeader
          title="Active projects"
          action={
            <Link href="/site-operations/projects" className="text-xs font-medium text-primary hover:underline">
              View all <ArrowRight className="ml-0.5 inline size-3" />
            </Link>
          }
        />
        {isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading…</p>
        ) : projects.length === 0 ? (
          <EmptyState title="No active projects" description="Projects you are running will appear here." />
        ) : (
          <DataGrid columns={projectColumns} rows={projects} rowKey={(p) => p.id} minWidth={1040} />
        )}
      </section>

      <section className={cn("grid gap-7", productionEnabled && "lg:grid-cols-[1.6fr_1fr]")}>
        <div>
          <SectionHeader title="Expenditure trend" meta="Last 6 months" />
          <div className="border-y py-4">
            <TrendChart points={overview?.spendTrend ?? []} />
          </div>
        </div>

        {productionEnabled && (
          <div>
            <SectionHeader
              title="Production"
              action={
                <Link href="/production" className="text-xs font-medium text-primary hover:underline">
                  Open
                </Link>
              }
            />
            <div className="border-y py-4">
              <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
                {kpis ? Math.round(kpis.productionThisMonth).toLocaleString() : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{productionUnitLabel} logged this month</p>
              <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Ordered — internal</dt>
                  <dd className="tabular-nums">{Math.round(kpis?.productionInternalTonnes ?? 0).toLocaleString()} t</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Ordered — external</dt>
                  <dd className="tabular-nums">{Math.round(kpis?.productionExternalTonnes ?? 0).toLocaleString()} t</dd>
                </div>
                {kpis?.productionVsPlanPct != null && (
                  <div className="flex justify-between gap-3 border-t pt-2">
                    <dt className="text-muted-foreground">Against plan</dt>
                    <dd
                      className={cn(
                        "tabular-nums",
                        kpis.productionVsPlanPct < 0 ? "text-status-warn" : "text-status-good",
                      )}
                    >
                      {kpis.productionVsPlanPct >= 0 ? "+" : ""}
                      {kpis.productionVsPlanPct.toFixed(0)}%
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Recent activity"
          action={
            <Link href="/site-operations" className="text-xs font-medium text-primary hover:underline">
              Open operations
            </Link>
          }
        />
        {recentActivity?.length === 0 ? (
          <p className="border-y py-5 text-sm text-muted-foreground">No activity logged yet.</p>
        ) : (
          <ul className="divide-y border-y">
            {(recentActivity ?? []).slice(0, 6).map((item: ActivityItem) => (
              <li key={item.id}>
                <Link href={item.href} className="flex gap-4 py-2.5 hover:bg-muted/40">
                  <time className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {relativeTime(item.timestamp)}
                  </time>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span>
                  </span>
                  <span className="hidden shrink-0 self-center text-xs text-muted-foreground sm:block">
                    {item.actor}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {user?.role !== "VIEWER" && (
        <section className="border-t pt-5">
          <form onSubmit={submitCommand} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Tell the system what you need done…"
              aria-label="Command"
              className="h-10 flex-1 rounded-md border bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={!command.trim()}
              className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Execute
            </button>
          </form>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(
              [
                ["Create a project…", "Create a new project called "],
                ["Log material usage…", "Log 30 bags of cement used today at "],
                ["Record spend…", "Record 120,000 spent on diesel at "],
                ["Analyse exceptions…", "Which projects are behind schedule and why?"],
              ] as const
            ).map(([label, seed]) => (
              <button
                key={label}
                type="button"
                className="hover:text-foreground hover:underline"
                onClick={() => setCommand(seed)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      <GenerateReportDialog open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}
