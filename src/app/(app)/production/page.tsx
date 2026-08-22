"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge, statusCellClass, type Status } from "@/components/data/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { BarChart } from "@/components/charts/BarChart";
import { useCompanyConfig } from "@/lib/companyConfig";
import { formatQty } from "@/lib/format";

interface SiteStatusRow {
  facilityId: string;
  facilityName: string;
  status: Status;
  statusLabel: string;
  actualToDate: number | null;
  proRatedTarget: number | null;
}

interface BatchSiteRow {
  facilityId: string;
  facilityName: string;
  todayBatchCount: number;
  todayNetTons: number;
  qcPassRate: number | null;
  awaitingQcCount: number;
}

export default function ProductionPage() {
  const router = useRouter();
  const { productionUnitLabel } = useCompanyConfig();
  const { data: sites } = trpc.productionFacility.list.useQuery();
  const { data, isLoading } = trpc.production.statusForAllFacilities.useQuery();
  const { data: batchData, isLoading: loadingBatch } = trpc.productionBatch.summaryForAllFacilities.useQuery();
  const { data: summary } = trpc.insights.moduleSummary.useQuery({ module: "production" });

  const simpleSiteIds = new Set((sites ?? []).filter((s) => s.productionMode === "SIMPLE").map((s) => s.id));

  const rows: SiteStatusRow[] = (data ?? [])
    .filter(({ facility }) => simpleSiteIds.has(facility.id))
    .map(({ facility, status }) => {
      let s: Status = "neutral";
      let label = "No target set";
      if (status.hasPlan) {
        s = status.isBehindPlan ? "bad" : "good";
        label = status.isBehindPlan ? "Behind plan" : "On track";
      }
      return {
        facilityId: facility.id,
        facilityName: facility.name,
        status: s,
        statusLabel: label,
        actualToDate: status.actualToDate ?? null,
        proRatedTarget: status.proRatedTarget ?? null,
      };
    });

  const batchRows: BatchSiteRow[] = (batchData ?? []).map(({ facility, summary }) => ({
    facilityId: facility.id,
    facilityName: facility.name,
    todayBatchCount: summary.todayBatchCount,
    todayNetTons: summary.todayNetTons,
    qcPassRate: summary.qcPassRate,
    awaitingQcCount: summary.awaitingQcCount,
  }));

  const withPlan = rows.filter((r) => r.status !== "neutral");
  const behindCount = rows.filter((r) => r.status === "bad").length;
  const onTrackCount = rows.filter((r) => r.status === "good").length;
  const noPlanCount = rows.filter((r) => r.status === "neutral").length;
  const totalBatchesToday = batchRows.reduce((sum, r) => sum + r.todayBatchCount, 0);
  const awaitingQcTotal = batchRows.reduce((sum, r) => sum + r.awaitingQcCount, 0);

  const columns: DataTableColumn<SiteStatusRow>[] = [
    { key: "site", header: "Facility", cell: (r) => r.facilityName },
    {
      key: "actual",
      header: `${productionUnitLabel} to date`,
      cell: (r) => (r.actualToDate === null ? "—" : formatQty(Math.round(r.actualToDate))),
      numeric: true,
    },
    {
      key: "target",
      header: "Expected by now",
      cell: (r) => (r.proRatedTarget === null ? "—" : formatQty(Math.round(r.proRatedTarget))),
      numeric: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} label={r.statusLabel} />,
      cellClassName: (r) => (r.status === "neutral" ? undefined : statusCellClass(r.status)),
    },
  ];

  const batchColumns: DataTableColumn<BatchSiteRow>[] = [
    { key: "site", header: "Facility", cell: (r) => r.facilityName },
    { key: "batches", header: "Batches today", cell: (r) => String(r.todayBatchCount), numeric: true },
    { key: "tons", header: "Net tons today", cell: (r) => formatQty(r.todayNetTons, "t"), numeric: true },
    {
      key: "qc",
      header: "QC pass rate",
      cell: (r) => (r.qcPassRate === null ? "—" : `${r.qcPassRate.toFixed(0)}%`),
      numeric: true,
    },
    {
      key: "awaiting",
      header: "Awaiting QC",
      cell: (r) =>
        r.awaitingQcCount > 0 ? (
          <StatusBadge status="warn" label={String(r.awaitingQcCount)} />
        ) : (
          <StatusBadge status="good" label="0" />
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold">Production</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/production/sites" className={buttonVariants({ variant: "outline" })}>
            Manage sites
          </Link>
          {batchRows.length > 0 && (
            <Link href="/production/batch/new" className={buttonVariants({ variant: "outline" })}>
              New batch
            </Link>
          )}
          {rows.length > 0 && (
            <Link href="/production/plan/new" className={buttonVariants({ variant: "outline" })}>
              New plan
            </Link>
          )}
          {rows.length > 0 && (
            <Link href="/production/log" className={buttonVariants()}>
              Log {productionUnitLabel}
            </Link>
          )}
        </div>
      </div>

      {summary && (
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm">{summary}</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-4">
          <StatRow>
            <StatTile label="On track" value={String(onTrackCount)} accent="good" />
            <StatTile label="Behind plan" value={String(behindCount)} accent={behindCount > 0 ? "bad" : "good"} />
            <StatTile label="No target set" value={String(noPlanCount)} />
            <StatTile label="Total facilities" value={String(rows.length)} />
          </StatRow>

          {withPlan.length > 0 && (
            <div className="rounded-md border p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                {productionUnitLabel} to date vs. expected by now
              </p>
              <BarChart
                items={withPlan.map((r) => ({
                  id: r.facilityId,
                  label: r.facilityName,
                  value: r.actualToDate ?? 0,
                  reference: r.proRatedTarget ?? undefined,
                  status: r.status,
                }))}
                referenceLabel="Expected by now"
                formatValue={(n) => formatQty(Math.round(n))}
              />
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.facilityId}
              onRowClick={(r) => router.push(`/production/${r.facilityId}`)}
              emptyTitle="No facilities yet"
            />
          )}
        </div>
      )}

      {batchRows.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-base font-semibold">Weighbridge production</h2>
            <p className="text-sm text-muted-foreground">Truck batches — weigh-in, weigh-out, lab quality control.</p>
          </div>

          <StatRow>
            <StatTile label="Batches today" value={String(totalBatchesToday)} />
            <StatTile label="Awaiting QC" value={String(awaitingQcTotal)} accent={awaitingQcTotal > 0 ? "warn" : "good"} />
          </StatRow>

          {loadingBatch ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <DataTable
              columns={batchColumns}
              rows={batchRows}
              rowKey={(r) => r.facilityId}
              onRowClick={(r) => router.push(`/production/${r.facilityId}`)}
              emptyTitle="No weighbridge lines yet"
            />
          )}
        </div>
      )}
    </div>
  );
}
