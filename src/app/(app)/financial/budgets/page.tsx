"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart } from "@/components/charts/BarChart";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { useCompanyConfig } from "@/lib/companyConfig";

export default function BudgetsPage() {
  const { siteTermLabel } = useCompanyConfig();
  const utils = trpc.useUtils();
  const { data: sites } = trpc.site.list.useQuery();
  const { data: costToComplete, isLoading } = trpc.budget.listCostToCompleteForAllSites.useQuery();
  const setBudget = trpc.budget.set.useMutation({
    onSuccess: async () => {
      await utils.budget.listCostToCompleteForAllSites.invalidate();
      setAmount("");
    },
  });

  const [siteId, setSiteId] = useState("");
  const [amount, setAmount] = useState("");

  const chartItems = (costToComplete ?? [])
    .filter((c) => c.costToComplete.budgetAmount !== null)
    .map((c) => ({
      id: c.site.id,
      label: c.site.name,
      value: c.costToComplete.committedSpend,
      reference: c.costToComplete.budgetAmount ?? undefined,
      status: (c.costToComplete.remaining ?? 0) < 0 ? ("bad" as const) : ("good" as const),
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Budgets</h1>
        <p className="text-sm text-muted-foreground">Set a budget per {siteTermLabel.toLowerCase()} and track committed spend against it.</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (siteId && amount) setBudget.mutate({ siteId, amount: Number(amount) });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="site">{siteTermLabel}</Label>
          <select
            id="site"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="h-8 w-48 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="" disabled>
              Select a {siteTermLabel.toLowerCase()}
            </option>
            {(sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Budget amount</Label>
          <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-40" />
        </div>
        <Button type="submit" disabled={!siteId || !amount || setBudget.isPending}>
          Set budget
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : chartItems.length > 0 ? (
        <div className="rounded-md border p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Committed spend vs. budget</p>
          <BarChart items={chartItems} referenceLabel="Budget" formatValue={(n) => formatCurrency(n)} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No budgets set yet — add one above.</p>
      )}

      <div className="rounded-md border">
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">All {siteTermLabel.toLowerCase()}s</div>
        <ul className="divide-y">
          {(costToComplete ?? []).map((c) => (
            <li key={c.site.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{c.site.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatCurrency(c.costToComplete.committedSpend)}
                {c.costToComplete.budgetAmount !== null && ` / ${formatCurrency(c.costToComplete.budgetAmount)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
