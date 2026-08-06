"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { RecordDetailLayout } from "@/components/data/RecordDetailLayout";
import { EmptyState } from "@/components/data/EmptyState";
import { StatusBadge, type Status } from "@/components/data/StatusBadge";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { Button } from "@/components/ui/button";
import { formatQty, formatDateTime } from "@/lib/format";

function statusMeta(status: string): { status: Status; label: string } {
  switch (status) {
    case "OPEN":
      return { status: "neutral", label: "Not started" };
    case "IN_PROGRESS":
      return { status: "warn", label: "In progress" };
    case "FULFILLED":
      return { status: "good", label: "Fulfilled" };
    case "CANCELLED":
      return { status: "bad", label: "Cancelled" };
    default:
      return { status: "neutral", label: status };
  }
}

function batchStatusMeta(status: string): { status: Status; label: string } {
  switch (status) {
    case "WEIGHED_IN":
      return { status: "neutral", label: "Weighed in" };
    case "WEIGHED_OUT":
      return { status: "warn", label: "Awaiting QC" };
    case "QC_PASSED":
      return { status: "good", label: "QC passed" };
    case "QC_FAILED":
      return { status: "bad", label: "QC failed" };
    default:
      return { status: "neutral", label: status };
  }
}

export default function ProductionOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.productionOrder.getById.useQuery({ id });
  const cancel = trpc.productionOrder.cancel.useMutation();

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const { order, progress } = data;
  const meta = statusMeta(progress.status);
  const canCancel = progress.status === "OPEN" || progress.status === "IN_PROGRESS";

  async function handleCancel() {
    await cancel.mutateAsync({ orderId: id });
    await utils.productionOrder.getById.invalidate({ id });
    await utils.productionOrder.listBySite.invalidate({ siteId: order.siteId });
    await utils.productionOrder.listByCompany.invalidate();
  }

  return (
    <RecordDetailLayout
      title={order.productLabel}
      subtitle={`${order.customer?.name ?? "No customer on file"} · ${order.site.name}`}
      badge={<StatusBadge status={meta.status} label={meta.label} />}
      actions={
        canCancel ? (
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancel.isPending}>
            Cancel order
          </Button>
        ) : undefined
      }
      main={
        <div className="flex flex-col gap-4">
          <StatRow>
            <StatTile label="Ordered" value={formatQty(progress.targetKg / 1000, "t")} />
            <StatTile
              label="Produced so far"
              value={formatQty(progress.producedKg / 1000, "t")}
              accent={progress.status === "FULFILLED" ? "good" : "neutral"}
            />
            <StatTile label="Remaining" value={formatQty(progress.remainingKg / 1000, "t")} />
            <StatTile label="Trucks so far" value={String(progress.batchCount)} />
          </StatRow>

          <div className="rounded-md border p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progress.percentComplete.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={progress.status === "FULFILLED" ? "h-full bg-status-good" : "h-full bg-status-warn"}
                style={{ width: `${Math.min(progress.percentComplete, 100)}%` }}
              />
            </div>
          </div>

          {order.notes && (
            <div className="rounded-md border p-4">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>
      }
      activity={
        order.batches.length === 0 ? (
          <EmptyState title="No trucks weighed in yet" description="Weigh a truck in against this order to start tracking progress." />
        ) : (
          <div className="rounded-md border">
            <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Trucks</div>
            <ul className="divide-y">
              {order.batches.map((batch) => {
                const bm = batchStatusMeta(batch.status);
                return (
                  <li key={batch.id}>
                    <Link
                      href={`/production/batch/${batch.id}`}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{batch.truckPlateNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(batch.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {batch.netWeightKg !== null && <span className="text-xs tabular-nums">{formatQty(batch.netWeightKg / 1000, "t")}</span>}
                        <StatusBadge status={bm.status} label={bm.label} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      }
    />
  );
}
