"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { EmptyState } from "@/components/data/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { useCompanyConfig } from "@/lib/companyConfig";
import { formatDateTime, formatQty } from "@/lib/format";

interface SiteWithProject {
  id: string;
  name: string;
  project: { id: string; name: string } | null;
}

function groupSitesByProject<T extends SiteWithProject>(sites: T[]): Array<{ key: string; label: string; sites: T[] }> {
  const groups = new Map<string, { key: string; label: string; sites: T[] }>();
  for (const site of sites) {
    const key = site.project?.id ?? "ungrouped";
    if (!groups.has(key)) groups.set(key, { key, label: site.project?.name ?? "Independent operations", sites: [] });
    groups.get(key)!.sites.push(site);
  }
  const ordered = Array.from(groups.values());
  ordered.sort((a, b) => (a.key === "ungrouped" ? 1 : b.key === "ungrouped" ? -1 : 0));
  return ordered;
}

export default function SiteOperationsPage() {
  const { siteTermLabel } = useCompanyConfig();
  const { data: today } = trpc.siteOperations.todaySummary.useQuery();
  const { data: activity, isLoading } = trpc.siteOperations.listRecentActivity.useQuery({ days: 7 });
  const { data: sites } = trpc.road.list.useQuery();
  const { data: summary } = trpc.insights.moduleSummary.useQuery({ module: "site-operations" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold">Project Operations</h1>
          <p className="text-sm text-muted-foreground">Review the activity, sites and work locations for every project.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/site-operations/projects" className={buttonVariants({ variant: "outline" })}>
            Manage projects
          </Link>
          <Link href="/materials/locations" className={buttonVariants({ variant: "outline" })}>
            Manage locations
          </Link>
          <Link href="/site-operations/expenses" className={buttonVariants({ variant: "outline" })}>
            Money in / out
          </Link>
          <Link href="/site-operations/log" className={buttonVariants()}>
            Log usage
          </Link>
        </div>
      </div>

      {summary && (
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm">{summary}</p>
        </div>
      )}

      <StatRow>
        <StatTile label="Logged today" value={String(today?.usageCount ?? 0)} />
        <StatTile
          label={`Active ${siteTermLabel.toLowerCase()}s today`}
          value={String(today?.activeSiteCount ?? 0)}
          sublabel={`of ${(sites ?? []).length} total`}
        />
      </StatRow>

      <div className="flex flex-col gap-5">
        {groupSitesByProject((sites ?? []).filter((site) => site.project !== null)).map((group) => (
          <div key={group.key}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Link href={`/site-operations/projects/${group.key}`} className="text-sm font-semibold text-primary hover:underline">{group.label}</Link>
              <Link href={`/site-operations/projects/${group.key}`} className="text-xs font-medium text-primary hover:underline">Open project</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.sites.map((site) => (
                <Link
                  key={site.id}
                  href={`/site-operations/${site.id}`}
                  className="group rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex items-start justify-between gap-3"><span><span className="block font-medium">{site.name}</span><span className="mt-1 block text-xs text-muted-foreground">Open daily notes, material usage and task activity</span></span><span className="text-primary transition-transform group-hover:translate-x-0.5">→</span></span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Recent activity</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !activity || activity.length === 0 ? (
          <EmptyState
            title="No activity logged yet"
            description="Material usage and daily notes logged by site teams will show up here."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((entry) => (
              <li key={`${entry.kind}:${entry.id}`} className="rounded-md border p-3">
                {entry.kind === "usage" ? (
                  <p className="text-sm">
                    <span className="font-medium">{entry.loggedByName}</span> logged{" "}
                    <span className="font-medium">{formatQty(entry.qty)} {entry.materialName}</span> for{" "}
                    <span className="italic">{entry.task}</span> at {entry.siteName}
                  </p>
                ) : (
                  <p className="text-sm">
                    <span className="font-medium">{entry.loggedByName}</span> noted for {entry.siteName}: {entry.note}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
