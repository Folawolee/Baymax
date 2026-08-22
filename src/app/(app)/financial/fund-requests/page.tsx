"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { scopeLabel, useScopeOptions, scopeArgs } from "@/lib/scopes";
import { useAuth } from "@/lib/auth";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge, type Status } from "@/components/data/StatusBadge";
import { ApprovalQueueRow } from "@/components/data/ApprovalQueueRow";
import { EmptyState } from "@/components/data/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";

function statusMeta(status: string): { status: Status; label: string } {
  switch (status) {
    case "PENDING":
      return { status: "warn", label: "Pending" };
    case "APPROVED":
      return { status: "warn", label: "Approved" };
    case "RELEASED":
      return { status: "good", label: "Released" };
    case "REJECTED":
      return { status: "bad", label: "Rejected" };
    default:
      return { status: "neutral", label: status };
  }
}

interface FundRequestRow {
  id: string;
  purpose: string;
  siteName: string;
  requestedByName: string;
  amountRequested: number;
  status: string;
  amountReleased: number | null;
}

function ReleaseForm({ fundRequestId, onDone }: { fundRequestId: string; onDone: () => void }) {
  const utils = trpc.useUtils();
  const [amountReleased, setAmountReleased] = useState("");
  const release = trpc.fundRequest.release.useMutation({
    onSuccess: async () => {
      await utils.fundRequest.listByCompany.invalidate();
      await utils.fundRequest.listPendingForRole.invalidate();
      setAmountReleased("");
      onDone();
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="0"
        placeholder="Amount to release"
        value={amountReleased}
        onChange={(e) => setAmountReleased(e.target.value)}
        className="h-8 w-40"
      />
      <Button
        size="sm"
        disabled={!amountReleased || release.isPending}
        onClick={() => release.mutate({ fundRequestId, amountReleased: Number(amountReleased) })}
      >
        {release.isPending ? "Releasing…" : "Release"}
      </Button>
    </div>
  );
}

function ReconciliationPanel({ fundRequestId }: { fundRequestId: string }) {
  const { data, isLoading } = trpc.fundRequest.getReconciliation.useQuery({ fundRequestId });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading reconciliation…</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4">
      <StatRow>
        <StatTile label="Released" value={formatCurrency(data.amountReleased)} />
        <StatTile label="Spent" value={formatCurrency(data.totalSpent)} />
        <StatTile
          label="Unreconciled"
          value={formatCurrency(data.unreconciled)}
          accent={data.unreconciled < 0 ? "bad" : data.unreconciled > 0 ? "warn" : "good"}
        />
      </StatRow>
      {data.expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses logged against this fund request yet.</p>
      ) : (
        <ul className="divide-y rounded-md border bg-background">
          {data.expenses.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <p>{e.paidTo}</p>
                <p className="text-xs text-muted-foreground">{e.description}</p>
              </div>
              <span className="tabular-nums">{formatCurrency(e.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FundRequestsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const scopes = useScopeOptions();
  const { data: pending, isLoading: isLoadingPending } = trpc.fundRequest.listPendingForRole.useQuery();
  const { data: fundRequests, isLoading } = trpc.fundRequest.listByCompany.useQuery();

  const createFundRequest = trpc.fundRequest.create.useMutation();
  const decide = trpc.fundRequest.decide.useMutation({
    onSuccess: async () => {
      await utils.fundRequest.listPendingForRole.invalidate();
      await utils.fundRequest.listByCompany.invalidate();
    },
  });

  const [scopeKey, setScopeKey] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amountRequested, setAmountRequested] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canRelease = user?.role === "OWNER_ADMIN" || user?.role === "FINANCE";
  const approvedAwaitingRelease = (fundRequests ?? []).filter((f) => f.status === "APPROVED");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!scopeKey || !purpose || !amountRequested) return;
    try {
      await createFundRequest.mutateAsync({ ...scopeArgs(scopeKey), purpose, amountRequested: Number(amountRequested) });
      await utils.fundRequest.listByCompany.invalidate();
      await utils.fundRequest.listPendingForRole.invalidate();
      setPurpose("");
      setAmountRequested("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit fund request");
    }
  }

  const rows: FundRequestRow[] = (fundRequests ?? []).map((f) => ({
    id: f.id,
    purpose: f.purpose,
    siteName: scopeLabel(f),
    requestedByName: f.requestedBy.name,
    amountRequested: f.amountRequested,
    status: f.status,
    amountReleased: f.amountReleased ?? null,
  }));

  const columns: DataTableColumn<FundRequestRow>[] = [
    { key: "purpose", header: "Purpose", cell: (r) => r.purpose },
    { key: "site", header: "Site", cell: (r) => r.siteName },
    { key: "requestedBy", header: "Requested by", cell: (r) => r.requestedByName },
    { key: "amountRequested", header: "Requested", cell: (r) => formatCurrency(r.amountRequested), numeric: true },
    {
      key: "status",
      header: "Status",
      cell: (r) => {
        const meta = statusMeta(r.status);
        return <StatusBadge status={meta.status} label={meta.label} />;
      },
    },
    {
      key: "amountReleased",
      header: "Released",
      cell: (r) => (r.amountReleased !== null ? formatCurrency(r.amountReleased) : "—"),
      numeric: true,
    },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        r.status === "RELEASED" ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
          >
            {selectedId === r.id ? "Hide reconciliation" : "View reconciliation"}
          </button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Fund requests</h1>
        <p className="text-sm text-muted-foreground">Request, approve and release funds to sites — then reconcile against spend.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 rounded-md border p-4 sm:max-w-sm">
        <p className="text-sm font-medium">Request funds</p>

        <div className="space-y-1.5">
          <Label htmlFor="site">Site</Label>
          <select
            id="site"
            value={scopeKey}
            onChange={(e) => setScopeKey(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a site</option>
            {scopes.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="purpose">Purpose</Label>
          <Textarea id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="e.g. Cement for foundation pour" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amountRequested">Amount</Label>
          <Input id="amountRequested" type="number" min="0" value={amountRequested} onChange={(e) => setAmountRequested(e.target.value)} />
        </div>

        {error && <p className="text-sm text-status-bad">{error}</p>}

        <Button type="submit" disabled={!scopeKey || !purpose || !amountRequested || createFundRequest.isPending}>
          {createFundRequest.isPending ? "Submitting…" : "Submit request"}
        </Button>
      </form>

      <div>
        <p className="mb-2 text-sm font-medium">Waiting on you</p>
        {isLoadingPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !pending || pending.length === 0 ? (
          <EmptyState title="Nothing is waiting on your approval" />
        ) : (
          <div className="rounded-md border">
            {pending.map((p) => (
              <ApprovalQueueRow
                key={p.id}
                title={`${p.purpose} — ${scopeLabel(p)}`}
                total={p.amountRequested}
                waitingSince={p.createdAt}
                isPending={decide.isPending}
                onApprove={() => decide.mutate({ fundRequestId: p.id, decision: "APPROVED" })}
                onReject={() => decide.mutate({ fundRequestId: p.id, decision: "REJECTED" })}
              />
            ))}
          </div>
        )}
      </div>

      {canRelease && approvedAwaitingRelease.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Approved — ready to release</p>
          <div className="flex flex-col gap-2 rounded-md border divide-y">
            {approvedAwaitingRelease.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{f.purpose}</p>
                  <p className="text-xs text-muted-foreground">
                    {scopeLabel(f)} · Approved for {formatCurrency(f.amountApproved ?? f.amountRequested)}
                  </p>
                </div>
                <ReleaseForm fundRequestId={f.id} onDone={() => {}} />
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No fund requests yet" />
      )}

      {selectedId && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Reconciliation — {rows.find((r) => r.id === selectedId)?.purpose}
          </p>
          <ReconciliationPanel fundRequestId={selectedId} />
        </div>
      )}
    </div>
  );
}
