"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { BarChart } from "@/components/charts/BarChart";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoCaptureField } from "@/components/data/PhotoCaptureField";
import { formatCurrency, formatDateTime } from "@/lib/format";

const CATEGORY_VALUES = ["FUEL", "LABOR", "MATERIALS", "EQUIPMENT", "TRANSPORT", "UTILITIES", "MISCELLANEOUS"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  FUEL: "Fuel",
  LABOR: "Labor",
  MATERIALS: "Materials",
  EQUIPMENT: "Equipment",
  TRANSPORT: "Transport",
  UTILITIES: "Utilities",
  MISCELLANEOUS: "Miscellaneous",
};

interface ExpenseRow {
  id: string;
  paidAt: string | Date;
  siteName: string;
  paidTo: string;
  description: string;
  category: string;
  categorizedByBimpe: boolean;
  amount: number;
}

interface ImprestRow {
  id: string;
  receivedAt: string | Date;
  siteName: string;
  source: string;
  description: string;
  amount: number;
}

export default function ExpensesPage() {
  const utils = trpc.useUtils();
  const { data: expenses, isLoading } = trpc.expense.list.useQuery();
  const { data: breakdown } = trpc.expense.categoryBreakdown.useQuery();
  const { data: imprests, isLoading: isLoadingImprests } = trpc.imprest.list.useQuery();
  const { data: sites } = trpc.site.list.useQuery({ activeOnly: true });

  const createExpense = trpc.expense.create.useMutation();
  const recategorize = trpc.expense.recategorize.useMutation();
  const createImprest = trpc.imprest.create.useMutation();

  const [siteId, setSiteId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const [imprestSiteId, setImprestSiteId] = useState("");
  const [imprestAmount, setImprestAmount] = useState("");
  const [imprestSource, setImprestSource] = useState("");
  const [imprestDescription, setImprestDescription] = useState("");
  const [imprestError, setImprestError] = useState<string | null>(null);

  useEffect(() => {
    if (siteId || !sites || sites.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSiteId(sites[0].id);
  }, [sites, siteId]);

  useEffect(() => {
    if (imprestSiteId || !sites || sites.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImprestSiteId(sites[0].id);
  }, [sites, imprestSiteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!siteId || !amount || !paidTo || !description) return;
    try {
      const expense = await createExpense.mutateAsync({ siteId, amount: Number(amount), paidTo, description });
      await utils.expense.list.invalidate();
      await utils.expense.categoryBreakdown.invalidate();
      setLastCreatedId(expense.id);
      setAmount("");
      setPaidTo("");
      setDescription("");
      setPhoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log expense");
    }
  }

  async function handleRecategorize(expenseId: string, category: string) {
    await recategorize.mutateAsync({ expenseId, category: category as (typeof CATEGORY_VALUES)[number] });
    await utils.expense.list.invalidate();
    await utils.expense.categoryBreakdown.invalidate();
  }

  async function handleImprestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImprestError(null);
    if (!imprestSiteId || !imprestAmount || !imprestSource || !imprestDescription) return;
    try {
      await createImprest.mutateAsync({
        siteId: imprestSiteId,
        amount: Number(imprestAmount),
        source: imprestSource,
        description: imprestDescription,
      });
      await utils.imprest.list.invalidate();
      setImprestAmount("");
      setImprestSource("");
      setImprestDescription("");
    } catch (err) {
      setImprestError(err instanceof Error ? err.message : "Failed to log imprest");
    }
  }

  const lastCreated = (expenses ?? []).find((e) => e.id === lastCreatedId);

  const rows: ExpenseRow[] = (expenses ?? []).map((e) => ({
    id: e.id,
    paidAt: e.paidAt,
    siteName: e.site.name,
    paidTo: e.paidTo,
    description: e.description,
    category: e.category,
    categorizedByBimpe: e.categorizedByBimpe,
    amount: e.amount,
  }));

  const columns: DataTableColumn<ExpenseRow>[] = [
    { key: "date", header: "Date", cell: (r) => formatDateTime(r.paidAt) },
    { key: "site", header: "Site", cell: (r) => r.siteName },
    { key: "paidTo", header: "Paid to", cell: (r) => r.paidTo },
    { key: "description", header: "Description", cell: (r) => r.description },
    {
      key: "category",
      header: "Category",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <StatusBadge status="neutral" label={CATEGORY_LABELS[r.category] ?? r.category} />
          <select
            value={r.category}
            onChange={(e) => handleRecategorize(r.id, e.target.value)}
            className="h-7 rounded-md border border-input bg-background px-1 text-xs"
            aria-label="Change category"
          >
            {CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    { key: "amount", header: "Amount", cell: (r) => formatCurrency(r.amount), numeric: true },
  ];

  const totalSpend = (breakdown ?? []).reduce((sum, b) => sum + b.total, 0);

  const imprestRows: ImprestRow[] = (imprests ?? []).map((i) => ({
    id: i.id,
    receivedAt: i.receivedAt,
    siteName: i.site.name,
    source: i.source,
    description: i.description,
    amount: i.amount,
  }));
  const imprestColumns: DataTableColumn<ImprestRow>[] = [
    { key: "date", header: "Date", cell: (r) => formatDateTime(r.receivedAt) },
    { key: "site", header: "Site", cell: (r) => r.siteName },
    { key: "source", header: "Received from", cell: (r) => r.source },
    { key: "description", header: "Description", cell: (r) => r.description },
    { key: "amount", header: "Amount", cell: (r) => formatCurrency(r.amount), numeric: true },
  ];
  const totalImprest = imprestRows.reduce((sum, r) => sum + r.amount, 0);
  const balance = totalImprest - totalSpend;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Money in / out</h1>
        <p className="text-sm text-muted-foreground">Imprest received and daily payments out — Bimpe categorizes each expense automatically.</p>
      </div>

      <StatRow>
        <StatTile label="Total imprest received" value={formatCurrency(totalImprest)} />
        <StatTile label="Total spent" value={formatCurrency(totalSpend)} />
        <StatTile label="Balance" value={formatCurrency(balance)} accent={balance < 0 ? "bad" : "good"} />
      </StatRow>

      {breakdown && breakdown.length > 0 && (
        <div className="rounded-md border p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Spend by category</p>
          <BarChart
            items={breakdown.map((b) => ({ id: b.category, label: CATEGORY_LABELS[b.category] ?? b.category, value: b.total }))}
            formatValue={(n) => formatCurrency(n)}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 rounded-md border p-4 sm:max-w-sm sm:flex-1">
          <p className="text-sm font-medium">Log an expense</p>

          <div className="space-y-1.5">
            <Label htmlFor="site">Site</Label>
            <select
              id="site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(sites ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paidTo">Paid to</Label>
            <Input id="paidTo" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="e.g. Total filling station" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Diesel refill for the excavator"
            />
          </div>

          <PhotoCaptureField value={photo} onChange={setPhoto} label="Add receipt photo" />

          {error && <p className="text-sm text-status-bad">{error}</p>}

          {lastCreated && (
            <p className="text-sm text-muted-foreground">
              Bimpe categorized this as <span className="font-medium text-foreground">{CATEGORY_LABELS[lastCreated.category]}</span> —
              change it above if that&rsquo;s wrong.
            </p>
          )}

          <Button type="submit" disabled={!siteId || !amount || !paidTo || !description || createExpense.isPending}>
            {createExpense.isPending ? "Saving…" : "Log expense"}
          </Button>
        </form>

        <form onSubmit={handleImprestSubmit} className="flex w-full flex-col gap-3 rounded-md border p-4 sm:max-w-sm sm:flex-1">
          <p className="text-sm font-medium">Log imprest received</p>

          <div className="space-y-1.5">
            <Label htmlFor="imprestSite">Site</Label>
            <select
              id="imprestSite"
              value={imprestSiteId}
              onChange={(e) => setImprestSiteId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(sites ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imprestSource">Received from</Label>
            <Input
              id="imprestSource"
              value={imprestSource}
              onChange={(e) => setImprestSource(e.target.value)}
              placeholder="e.g. Head Office"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imprestAmount">Amount</Label>
            <Input id="imprestAmount" type="number" min="0" value={imprestAmount} onChange={(e) => setImprestAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imprestDescription">Description</Label>
            <Textarea
              id="imprestDescription"
              value={imprestDescription}
              onChange={(e) => setImprestDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Monthly float top-up"
            />
          </div>

          {imprestError && <p className="text-sm text-status-bad">{imprestError}</p>}

          <Button
            type="submit"
            disabled={!imprestSiteId || !imprestAmount || !imprestSource || !imprestDescription || createImprest.isPending}
          >
            {createImprest.isPending ? "Saving…" : "Log imprest"}
          </Button>
        </form>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No expenses logged yet" />
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Imprest received</p>
        {isLoadingImprests ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <DataTable columns={imprestColumns} rows={imprestRows} rowKey={(r) => r.id} emptyTitle="No imprest logged yet" />
        )}
      </div>
    </div>
  );
}
