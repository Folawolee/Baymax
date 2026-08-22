"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { scopeLabel } from "@/lib/scopes";
import { RecordDetailLayout } from "@/components/data/RecordDetailLayout";
import { ActivityLog, type ActivityEntry } from "@/components/data/ActivityLog";
import { StatusBadge, type Status } from "@/components/data/StatusBadge";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatQty } from "@/lib/format";

function PaymentsSection({ purchaseOrderId }: { purchaseOrderId: string }) {
  const utils = trpc.useUtils();
  const { data: po } = trpc.purchaseOrder.getById.useQuery({ id: purchaseOrderId });
  const { data: summary } = trpc.purchaseOrder.getPaymentSummary.useQuery({ purchaseOrderId });

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recordPayment = trpc.purchaseOrder.recordPayment.useMutation({
    onSuccess: async () => {
      await utils.purchaseOrder.getById.invalidate({ id: purchaseOrderId });
      await utils.purchaseOrder.getPaymentSummary.invalidate({ purchaseOrderId });
      setAmount("");
      setMethod("");
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amount) return;
    try {
      await recordPayment.mutateAsync({ purchaseOrderId, amount: Number(amount), method: method.trim() || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <p className="text-sm font-medium">Payments</p>

      {summary && (
        <StatRow>
          <StatTile label="Owed" value={formatCurrency(summary.totalOwed)} />
          <StatTile label="Paid" value={formatCurrency(summary.totalPaid)} />
          <StatTile
            label="Remaining"
            value={formatCurrency(summary.remaining)}
            accent={summary.remaining <= 0 ? "good" : "warn"}
          />
        </StatRow>
      )}

      {po && po.payments.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {po.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <p>{formatDateTime(p.paidAt)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.method ? `${p.method} · ` : ""}Recorded by {p.recordedBy.name}
                </p>
              </div>
              <span className="tabular-nums font-medium">{formatCurrency(p.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="paymentAmount">Amount</Label>
          <Input
            id="paymentAmount"
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paymentMethod">Method (optional)</Label>
          <Input
            id="paymentMethod"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="e.g. Bank transfer"
            className="w-48"
          />
        </div>
        <Button type="submit" disabled={!amount || recordPayment.isPending}>
          {recordPayment.isPending ? "Recording…" : "Record payment"}
        </Button>
      </form>

      {error && <p className="text-sm text-status-bad">{error}</p>}
    </div>
  );
}

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
      subtitle={`${scopeLabel(po)} · Requested ${formatDate(po.createdAt)}`}
      badge={
        <div className="flex items-center gap-2">
          <StatusBadge status={meta.status} label={meta.label} />
          {po.draftedByBimpe && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3" />
              Drafted by Baymax AI
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

          <PaymentsSection purchaseOrderId={po.id} />
        </div>
      }
      activity={<ActivityLog entries={activity} />}
    />
  );
}
