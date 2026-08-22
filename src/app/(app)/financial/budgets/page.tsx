"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart } from "@/components/charts/BarChart";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { useCompanyConfig } from "@/lib/companyConfig";
import { useScopeOptions, scopeArgs, entryScope } from "@/lib/scopes";

export default function BudgetsPage() {
  const { siteTermLabel } = useCompanyConfig();
  const utils = trpc.useUtils();
  const scopes = useScopeOptions();
  const { data: costToComplete, isLoading } = trpc.budget.listCostToCompleteForAllSites.useQuery();
  const setBudget = trpc.budget.set.useMutation({
    onSuccess: async () => {
      await utils.budget.listCostToCompleteForAllSites.invalidate();
      setAmount("");
    },
  });

  const [scopeKey, setScopeKey] = useState("");
  const [amount, setAmount] = useState("");

  const chartItems = (costToComplete ?? [])
    .filter((c) => c.costToComplete.budgetAmount !== null)
    .map((c) => ({
      id: entryScope(c).id,
      label: entryScope(c).name,
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
          if (scopeKey && amount) setBudget.mutate({ ...scopeArgs(scopeKey), amount: Number(amount) });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="site">{siteTermLabel}</Label>
          <select
            id="site"
            value={scopeKey}
            onChange={(e) => setScopeKey(e.target.value)}
            className="h-8 w-48 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="" disabled>
              Select a {siteTermLabel.toLowerCase()}
            </option>
            {scopes.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Budget amount</Label>
          <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-40" />
        </div>
        <Button type="submit" disabled={!scopeKey || !amount || setBudget.isPending}>
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
            <li key={entryScope(c).key} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{entryScope(c).name}</span>
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
