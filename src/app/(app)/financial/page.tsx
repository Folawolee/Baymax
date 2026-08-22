"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { entryScope } from "@/lib/scopes";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { BarChart } from "@/components/charts/BarChart";
import { NetFlowChart } from "@/components/charts/NetFlowChart";
import { buttonVariants } from "@/components/ui/button";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/expenseCategories";

export default function FinancialOverviewPage() {
  const { data: receivables, isLoading: loadingReceivables } = trpc.invoice.receivablesSummary.useQuery();
  const { data: costToComplete, isLoading: loadingCost } = trpc.budget.listCostToCompleteForAllSites.useQuery();
  const { data: profitability, isLoading: loadingProfitability } = trpc.financial.profitability.useQuery();
  const { data: cashFlow, isLoading: loadingCashFlow } = trpc.financial.cashFlowProjection.useQuery({ weeks: 12 });
  const { data: expenseBreakdown } = trpc.expense.categoryBreakdown.useQuery();
  const { data: summary } = trpc.insights.moduleSummary.useQuery({ module: "financial" });

  const totalCommittedSpend = (costToComplete ?? []).reduce((sum, c) => sum + c.costToComplete.committedSpend, 0);
  const totalRevenue = (profitability ?? []).reduce((sum, p) => sum + p.revenue, 0);
  const totalCost = (profitability ?? []).reduce((sum, p) => sum + p.cost, 0);
  const overallMarginPct = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : null;

  const isLoading = loadingReceivables || loadingCost || loadingProfitability || loadingCashFlow;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold">Financial</h1>
          <p className="text-sm text-muted-foreground">Budgets, receivables, profitability and cash flow.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/financial/dashboard" className={buttonVariants({ variant: "outline" })}>
            Dashboard
          </Link>
          <Link href="/financial/daily-report" className={buttonVariants({ variant: "outline" })}>
            Daily Report
          </Link>
          <Link href="/financial/customers" className={buttonVariants({ variant: "outline" })}>
            Customers
          </Link>
          <Link href="/financial/budgets" className={buttonVariants({ variant: "outline" })}>
            Budgets
          </Link>
          <Link href="/financial/fund-requests" className={buttonVariants({ variant: "outline" })}>
            Fund Requests
          </Link>
          <Link href="/financial/invoices" className={buttonVariants()}>
            Invoices
          </Link>
        </div>
      </div>

      {summary && (
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm">{summary}</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <StatRow>
            <StatTile label="Outstanding receivables" value={formatCompactCurrency(receivables?.totalOutstanding ?? 0)} />
            <StatTile
              label="Overdue"
              value={formatCompactCurrency(receivables?.overdueAmount ?? 0)}
              sublabel={`${receivables?.overdueCount ?? 0} invoice(s)`}
              accent={(receivables?.overdueCount ?? 0) > 0 ? "bad" : "good"}
            />
            <StatTile label="Committed spend" value={formatCompactCurrency(totalCommittedSpend)} />
            <StatTile
              label="Overall margin"
              value={overallMarginPct === null ? "—" : `${overallMarginPct.toFixed(1)}%`}
              accent={overallMarginPct === null ? "neutral" : overallMarginPct >= 0 ? "good" : "bad"}
            />
          </StatRow>

          {profitability && profitability.length > 0 && (
            <div className="rounded-md border p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Revenue vs. cost by site</p>
              <BarChart
                items={profitability.map((p) => ({
                  id: entryScope(p).id,
                  label: entryScope(p).name,
                  value: p.revenue,
                  reference: p.cost,
                  status: p.margin >= 0 ? "good" : "bad",
                }))}
                referenceLabel="Cost"
                formatValue={(n) => formatCurrency(n)}
              />
            </div>
          )}

          {cashFlow && cashFlow.length > 0 && (
            <div className="rounded-md border p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Net cash flow — next 12 weeks</p>
              <NetFlowChart buckets={cashFlow} formatValue={(n) => formatCompactCurrency(n)} />
            </div>
          )}

          {expenseBreakdown && expenseBreakdown.length > 0 && (
            <div className="rounded-md border p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Spend by category</p>
              <BarChart
                items={expenseBreakdown.map((b) => ({
                  id: b.category,
                  label: CATEGORY_LABELS[b.category] ?? b.category,
                  value: b.total,
                }))}
                formatValue={(n) => formatCurrency(n)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
