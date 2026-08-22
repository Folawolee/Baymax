"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { scopeLabel, useScopeOptions, scopeArgs } from "@/lib/scopes";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge, statusCellClass, type Status } from "@/components/data/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/format";

function statusMeta(invoice: { status: string; dueDate: string | Date; amount: number; payments: Array<{ amount: number }> }): {
  status: Status;
  label: string;
} {
  const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  if (invoice.status === "PAID") return { status: "good", label: "Paid" };
  if (invoice.status === "DRAFT") return { status: "neutral", label: "Draft" };
  if (new Date(invoice.dueDate) < new Date() && paid < invoice.amount) return { status: "bad", label: "Overdue" };
  return { status: "warn", label: "Sent" };
}

export default function InvoicesPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: invoices, isLoading } = trpc.invoice.list.useQuery();
  const { data: customers } = trpc.customer.list.useQuery();
  const scopes = useScopeOptions();
  const create = trpc.invoice.create.useMutation({
    onSuccess: async (invoice) => {
      await utils.invoice.list.invalidate();
      router.push(`/financial/invoices/${invoice.id}`);
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [scopeKey, setScopeKey] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const columns: DataTableColumn<NonNullable<typeof invoices>[number]>[] = [
    { key: "customer", header: "Customer", cell: (inv) => inv.customer.name },
    { key: "site", header: "Site", cell: (inv) => scopeLabel(inv) },
    { key: "amount", header: "Amount", cell: (inv) => formatCurrency(inv.amount), numeric: true },
    { key: "due", header: "Due", cell: (inv) => formatDate(inv.dueDate) },
    {
      key: "status",
      header: "Status",
      cell: (inv) => {
        const meta = statusMeta(inv);
        return <StatusBadge status={meta.status} label={meta.label} />;
      },
      cellClassName: (inv) => {
        const meta = statusMeta(inv);
        return meta.status === "neutral" ? undefined : statusCellClass(meta.status);
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">What&rsquo;s been billed, and what&rsquo;s still owed.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
          {showForm ? "Cancel" : "New invoice"}
        </Button>
      </div>

      {showForm && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-md border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!scopeKey || !customerId || !amount || !dueDate) return;
            create.mutate({
              ...scopeArgs(scopeKey),
              customerId,
              amount: Number(amount),
              issueDate: new Date(),
              dueDate: new Date(dueDate),
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="inv-site">Site</Label>
            <select id="inv-site" value={scopeKey} onChange={(e) => setScopeKey(e.target.value)} className="h-8 w-40 rounded-lg border border-input bg-background px-2.5 text-sm">
              <option value="" disabled>
                Select
              </option>
              {scopes.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-customer">Customer</Label>
            <select id="inv-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-8 w-40 rounded-lg border border-input bg-background px-2.5 text-sm">
              <option value="" disabled>
                Select
              </option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-amount">Amount</Label>
            <Input id="inv-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-due">Due date</Label>
            <Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-40" />
          </div>
          <Button type="submit" disabled={create.isPending}>
            Create draft
          </Button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={invoices ?? []}
          rowKey={(inv) => inv.id}
          onRowClick={(inv) => router.push(`/financial/invoices/${inv.id}`)}
          emptyTitle="No invoices yet"
          emptyDescription="Invoices you send to customers for completed work will show up here."
        />
      )}
    </div>
  );
}
