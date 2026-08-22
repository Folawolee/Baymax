"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { RecordDetailLayout } from "@/components/data/RecordDetailLayout";
import { ActivityLog } from "@/components/data/ActivityLog";
import { StatusBadge } from "@/components/data/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { BarChart } from "@/components/charts/BarChart";
import { buttonVariants } from "@/components/ui/button";
import { useCompanyConfig } from "@/lib/companyConfig";
import { formatDate, formatQty } from "@/lib/format";

interface BatchRow {
  id: string;
  truckPlateNumber: string;
  productLabel: string;
  netWeightKg: number | null;
  status: string;
  customerName: string | null;
}

function orderStatusMeta(status: string): { label: string; kind: "good" | "warn" | "bad" | "neutral" } {
  switch (status) {
    case "OPEN":
      return { label: "Not started", kind: "neutral" };
    case "IN_PROGRESS":
      return { label: "In progress", kind: "warn" };
    case "FULFILLED":
      return { label: "Fulfilled", kind: "good" };
    case "CANCELLED":
      return { label: "Cancelled", kind: "bad" };
    default:
      return { label: status, kind: "neutral" };
  }
}

function batchStatusMeta(status: string): { label: string; kind: "good" | "warn" | "bad" | "neutral" } {
  switch (status) {
    case "WEIGHED_IN":
      return { label: "Weighed in", kind: "neutral" };
    case "WEIGHED_OUT":
      return { label: "Awaiting QC", kind: "warn" };
    case "QC_PASSED":
      return { label: "QC passed", kind: "good" };
    case "QC_FAILED":
      return { label: "QC failed", kind: "bad" };
    default:
      return { label: status, kind: "neutral" };
  }
}

export default function ProductionSiteDetailPage() {
  const { siteId: facilityId } = useParams<{ siteId: string }>();
  const { productionUnitLabel } = useCompanyConfig();
  const { data: sites } = trpc.productionFacility.list.useQuery();
  const site = sites?.find((s) => s.id === facilityId);
  const isBatchMode = site?.productionMode === "BATCH_WEIGHBRIDGE";

  if (site && isBatchMode) {
    return <BatchSiteDetail facilityId={facilityId} facilityName={site.name} facilityTypeLabel={site.facilityType} />;
  }

  return <SimpleSiteDetail facilityId={facilityId} site={site} productionUnitLabel={productionUnitLabel} />;
}

function SimpleSiteDetail({
  facilityId,
  site,
  productionUnitLabel,
}: {
  facilityId: string;
  site: { name: string; facilityType: string } | undefined;
  productionUnitLabel: string;
}) {
  const { data: status, isLoading } = trpc.production.planVsActual.useQuery({ facilityId });
  const { data: logs } = trpc.production.listLogs.useQuery({ facilityId });

  if (isLoading || !status) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const badge = !status.hasPlan ? (
    <StatusBadge status="neutral" label="No target set" />
  ) : (
    <StatusBadge status={status.isBehindPlan ? "bad" : "good"} label={status.isBehindPlan ? "Behind plan" : "On track"} />
  );

  const recentLogs = [...(logs ?? [])].reverse().slice(-10);

  return (
    <RecordDetailLayout
      title={site?.name ?? facilityId}
      subtitle={site?.facilityType}
      badge={badge}
      main={
        <div className="flex flex-col gap-4">
          {status.hasPlan ? (
            <StatRow>
              <StatTile
                label={`${productionUnitLabel} to date`}
                value={formatQty(Math.round(status.actualToDate ?? 0))}
                accent={status.isBehindPlan ? "bad" : "good"}
              />
              <StatTile label="Expected by now" value={formatQty(Math.round(status.proRatedTarget ?? 0))} />
              <StatTile label="Target" value={formatQty(status.planTargetOutput ?? 0)} />
              <StatTile
                label="Ahead/behind"
                value={`${status.variancePct !== undefined && status.variancePct > 0 ? "+" : ""}${status.variancePct?.toFixed(1)}%`}
                accent={status.isBehindPlan ? "bad" : "good"}
              />
            </StatRow>
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-md border p-4">
              <p className="text-sm text-muted-foreground">No target set for this period yet.</p>
              <Link href={`/production/plan/new?facilityId=${facilityId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Set a target
              </Link>
            </div>
          )}

          {recentLogs.length > 0 && (
            <div className="rounded-md border p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Recent {productionUnitLabel} log</p>
              <BarChart
                items={recentLogs.map((log) => ({
                  id: log.id,
                  label: formatDate(log.date),
                  value: log.output,
                }))}
                formatValue={(n) => formatQty(n)}
              />
            </div>
          )}
        </div>
      }
      activity={
        <ActivityLog
          entries={(logs ?? []).map((log) => ({
            id: log.id,
            actor: log.loggedBy.name,
            action: `logged ${formatQty(log.output, productionUnitLabel)}${log.notes ? ` — ${log.notes}` : ""}`,
            timestamp: log.date,
          }))}
        />
      }
    />
  );
}

function BatchSiteDetail({
  facilityId,
  facilityName,
  facilityTypeLabel,
}: {
  facilityId: string;
  facilityName: string;
  facilityTypeLabel: string;
}) {
  const router = useRouter();
  const { data: batches, isLoading } = trpc.productionBatch.listByFacility.useQuery({ facilityId });
  const { data: summary } = trpc.productionBatch.facilitySummary.useQuery({ facilityId });
  const { data: orders } = trpc.productionOrder.listByFacility.useQuery({ facilityId });

  const rows: BatchRow[] = (batches ?? []).map((b) => ({
    id: b.id,
    truckPlateNumber: b.truckPlateNumber,
    productLabel: b.productLabel,
    netWeightKg: b.netWeightKg,
    status: b.status,
    customerName: b.order?.customer?.name ?? (b.order ? "Order" : null),
  }));

  const columns: DataTableColumn<BatchRow>[] = [
    { key: "plate", header: "Truck plate", cell: (r) => r.truckPlateNumber },
    { key: "product", header: "Product", cell: (r) => r.productLabel },
    { key: "order", header: "Order", cell: (r) => r.customerName ?? "—" },
    {
      key: "net",
      header: "Net weight",
      cell: (r) => (r.netWeightKg === null ? "—" : formatQty(r.netWeightKg / 1000, "t")),
      numeric: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => {
        const meta = batchStatusMeta(r.status);
        return <StatusBadge status={meta.kind} label={meta.label} />;
      },
    },
  ];

  const activeOrders = (orders ?? []).filter(
    ({ progress }) => progress.status === "OPEN" || progress.status === "IN_PROGRESS",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold">{facilityName}</h1>
          <p className="text-sm text-muted-foreground">{facilityTypeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/production/orders/new?facilityId=${facilityId}`} className={buttonVariants({ variant: "outline" })}>
            New order
          </Link>
          <Link href="/production/batch/new" className={buttonVariants()}>
            New batch
          </Link>
        </div>
      </div>

      {summary && (
        <StatRow>
          <StatTile label="Batches today" value={String(summary.todayBatchCount)} />
          <StatTile label="Net tons today" value={formatQty(summary.todayNetTons, "t")} />
          <StatTile
            label="QC pass rate"
            value={summary.qcPassRate === null ? "—" : `${summary.qcPassRate.toFixed(0)}%`}
            accent={summary.qcPassRate !== null && summary.qcPassRate < 90 ? "warn" : "good"}
          />
          <StatTile
            label="Awaiting QC"
            value={String(summary.awaitingQcCount)}
            accent={summary.awaitingQcCount > 0 ? "warn" : "good"}
          />
        </StatRow>
      )}

      {activeOrders.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Orders</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeOrders.map(({ order, progress }) => {
              const meta = orderStatusMeta(progress.status);
              return (
                <Link
                  key={order.id}
                  href={`/production/orders/${order.id}`}
                  className="flex flex-col gap-2 rounded-md border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{order.customer?.name ?? "No customer on file"}</p>
                    <StatusBadge status={meta.kind} label={meta.label} />
                  </div>
                  <p className="text-xs text-muted-foreground">{order.productLabel}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={progress.status === "FULFILLED" ? "h-full bg-status-good" : "h-full bg-status-warn"}
                      style={{ width: `${Math.min(progress.percentComplete, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatQty(progress.producedKg / 1000, "t")} of {formatQty(progress.targetKg / 1000, "t")} produced
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/production/batch/${r.id}`)}
          emptyTitle="No batches yet"
          emptyDescription="Weigh in a truck to start tracking a batch."
        />
      )}
    </div>
  );
}
