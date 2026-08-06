"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { RecordDetailLayout } from "@/components/data/RecordDetailLayout";
import { ActivityLog, type ActivityEntry } from "@/components/data/ActivityLog";
import { StatusBadge, type Status } from "@/components/data/StatusBadge";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { Sparkles } from "lucide-react";
import { formatCurrency, formatDate, formatQty } from "@/lib/format";

function statusMeta(status: string): { status: Status; label: string } {
  switch (status) {
    case "DRAFT":
      return { status: "neutral", label: "Draft" };
    case "PENDING_APPROVAL":
      return { status: "warn", label: "Pending approval" };
    case "APPROVED":
      return { status: "warn", label: "Approved — awaiting delivery" };
    case "PARTIALLY_DELIVERED":
      return { status: "warn", label: "Partially delivered" };
    case "DELIVERED":
      return { status: "good", label: "Delivered" };
    case "REJECTED":
      return { status: "bad", label: "Rejected" };
    default:
      return { status: "neutral", label: status };
  }
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: po, isLoading } = trpc.purchaseOrder.getById.useQuery({ id });
  // Lazy initializer, not a plain Date.now() call — reads "now" once, on
  // first render, without the render function itself being impure.
  const [now] = useState(() => Date.now());

  if (isLoading || !po) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const meta = statusMeta(po.status);
  const total = po.lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const orderedQty = po.lines.reduce((sum, l) => sum + l.qty, 0);
  const deliveredQty = po.deliveries.reduce(
    (sum, d) => sum + d.lines.reduce((s, dl) => s + dl.qty, 0),
    0,
  );
  const percentDelivered = orderedQty > 0 ? Math.min((deliveredQty / orderedQty) * 100, 100) : 0;
  const daysToExpected = po.expectedDeliveryDate
    ? Math.round((new Date(po.expectedDeliveryDate).getTime() - now) / (1000 * 60 * 60 * 24))
    : null;

  const activity: ActivityEntry[] = [
    { id: `req-${po.id}`, actor: po.requestedBy.name, action: "requested this order", timestamp: po.createdAt },
    ...po.approvals
      .filter((a) => a.decidedAt)
      .map((a) => ({
        id: a.id,
        actor: a.approver?.name ?? "An approver",
        action: a.status === "APPROVED" ? "approved this order" : "rejected this order",
        timestamp: a.decidedAt!,
      })),
    ...po.deliveries.map((d) => ({
      id: d.id,
      actor: d.receivedBy.name,
      action: `recorded a delivery to ${d.location.name} (${d.lines.length} line item${d.lines.length === 1 ? "" : "s"})`,
      timestamp: d.timestamp,
    })),
  ];

  return (
    <RecordDetailLayout
      title={po.vendor.name}
      subtitle={`${po.site.name} · Requested ${formatDate(po.createdAt)}`}
      badge={
        <div className="flex items-center gap-2">
          <StatusBadge status={meta.status} label={meta.label} />
          {po.draftedByBimpe && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3" />
              Drafted by Bimpe
            </span>
          )}
        </div>
      }
      main={
        <div className="flex flex-col gap-4">
          <StatRow>
            <StatTile label="Total" value={formatCurrency(total)} />
            <StatTile label="Line items" value={String(po.lines.length)} />
            <StatTile
              label="Delivered"
              value={`${Math.round(percentDelivered)}%`}
              accent={percentDelivered >= 100 ? "good" : percentDelivered > 0 ? "warn" : "neutral"}
            />
            {daysToExpected !== null && (
              <StatTile
                label={daysToExpected < 0 ? "Days overdue" : "Days to expected"}
                value={String(Math.abs(daysToExpected))}
                accent={daysToExpected < 0 ? "bad" : "neutral"}
              />
            )}
          </StatRow>

          <div className="rounded-md border">
            <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Line items</div>
            <ul className="divide-y">
              {po.lines.map((line) => (
                <li key={line.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{line.material.name}</span>
                  <span className="tabular-nums">
                    {formatQty(line.qty, line.material.unitOfMeasure)} × {formatCurrency(line.price)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t px-3 py-2 text-sm font-medium">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          {po.expectedDeliveryDate && (
            <p className="text-sm text-muted-foreground">Expected delivery: {formatDate(po.expectedDeliveryDate)}</p>
          )}
        </div>
      }
      activity={<ActivityLog entries={activity} />}
    />
  );
}
