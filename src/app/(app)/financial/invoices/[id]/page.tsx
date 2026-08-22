"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { scopeLabel } from "@/lib/scopes";
import { RecordDetailLayout } from "@/components/data/RecordDetailLayout";
import { ActivityLog } from "@/components/data/ActivityLog";
import { StatusBadge, type Status } from "@/components/data/StatusBadge";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/format";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const { data: invoice, isLoading } = trpc.invoice.getById.useQuery({ id });
  const send = trpc.invoice.send.useMutation({ onSuccess: () => utils.invoice.getById.invalidate({ id }) });
  const recordPayment = trpc.invoice.recordPayment.useMutation({
    onSuccess: () => {
      utils.invoice.getById.invalidate({ id });
      setPaymentAmount("");
    },
  });

  const [paymentAmount, setPaymentAmount] = useState("");

  if (isLoading || !invoice) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const paidTotal = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = invoice.amount - paidTotal;
  const isOverdue = invoice.status === "SENT" && new Date(invoice.dueDate) < new Date() && remaining > 0;

  let status: Status = "neutral";
  let statusLabel = "Draft";
  if (invoice.status === "PAID") {
    status = "good";
    statusLabel = "Paid";
  } else if (isOverdue) {
    status = "bad";
    statusLabel = "Overdue";
  } else if (invoice.status === "SENT") {
    status = "warn";
    statusLabel = "Sent";
  }

  return (
    <RecordDetailLayout
      title={invoice.customer.name}
      subtitle={`${scopeLabel(invoice)} · Issued ${formatDate(invoice.issueDate)} · Due ${formatDate(invoice.dueDate)}`}
      badge={<StatusBadge status={status} label={statusLabel} />}
      actions={
        invoice.status === "DRAFT" ? (
          <Button onClick={() => send.mutate({ invoiceId: invoice.id })} disabled={send.isPending}>
            Send invoice
          </Button>
        ) : undefined
      }
      main={
        <div className="flex flex-col gap-4">
          <StatRow>
            <StatTile label="Amount" value={formatCurrency(invoice.amount)} />
            <StatTile label="Paid so far" value={formatCurrency(paidTotal)} accent={paidTotal > 0 ? "good" : "neutral"} />
            <StatTile label="Remaining" value={formatCurrency(remaining)} accent={remaining > 0 && isOverdue ? "bad" : "neutral"} />
          </StatRow>

          {invoice.status !== "DRAFT" && remaining > 0 && (
            <form
              className="flex flex-wrap items-end gap-2 rounded-md border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (paymentAmount) recordPayment.mutate({ invoiceId: invoice.id, amount: Number(paymentAmount) });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="payment-amount">Record a payment</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={remaining}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button type="submit" disabled={!paymentAmount || recordPayment.isPending}>
                Record payment
              </Button>
            </form>
          )}

          {invoice.status === "DRAFT" && (
            <p className="text-sm text-muted-foreground">This invoice is still a draft — send it before recording payments.</p>
          )}
        </div>
      }
      activity={
        <ActivityLog
          entries={invoice.payments.map((p) => ({
            id: p.id,
            actor: p.recordedBy.name,
            action: `recorded a payment of ${formatCurrency(p.amount)}${p.method ? ` via ${p.method}` : ""}`,
            timestamp: p.paidAt,
          }))}
        />
      }
    />
  );
}
