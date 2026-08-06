"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
    if (!groups.has(key)) groups.set(key, { key, label: site.project?.name ?? "Ungrouped", sites: [] });
    groups.get(key)!.sites.push(site);
  }
  const ordered = Array.from(groups.values());
  ordered.sort((a, b) => (a.key === "ungrouped" ? 1 : b.key === "ungrouped" ? -1 : 0));
  return ordered;
}

export default function SiteOperationsPage() {
  const router = useRouter();
  const { siteTermLabel } = useCompanyConfig();
  const { data: today } = trpc.siteOperations.todaySummary.useQuery();
  const { data: activity, isLoading } = trpc.siteOperations.listRecentActivity.useQuery({ days: 7 });
  const { data: sites } = trpc.site.list.useQuery();
  const { data: summary } = trpc.insights.moduleSummary.useQuery({ module: "site-operations" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold">Site Operations</h1>
          <p className="text-sm text-muted-foreground">What happened at each {siteTermLabel.toLowerCase()} today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/site-operations/projects" className={buttonVariants({ variant: "outline" })}>
            Manage projects
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

      <div className="flex flex-col gap-3">
        {groupSitesByProject(sites ?? []).map((group) => (
          <div key={group.key}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => router.push(`/site-operations/${site.id}`)}
                  className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {site.name}
                </button>
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
