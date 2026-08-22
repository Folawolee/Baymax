"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { scopeLabel, useScopeOptions, scopeArgs, entryScope } from "@/lib/scopes";
import { useAuth } from "@/lib/auth";
import { useCompanyConfig } from "@/lib/companyConfig";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { BarChart } from "@/components/charts/BarChart";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { EmptyState } from "@/components/data/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_LABELS } from "@/lib/expenseCategories";
import { formatCompactCurrency, formatCurrency, formatDateTime } from "@/lib/format";

function currentMonthValue(): string {
  return new Date().toISOString().slice(0, 7);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthRange(monthValue: string): { periodStart: Date; periodEnd: Date } {
  const [year, month] = monthValue.split("-").map(Number);
  return {
    periodStart: new Date(Date.UTC(year, month - 1, 1)),
    periodEnd: new Date(Date.UTC(year, month, 1)),
  };
}

/** Best-effort extraction — BimpeAction.payload is a free-form Json column, only CREATE_EXPENSE actions reach here and those always carry an amount. */
function payloadAmount(payload: unknown): number {
  if (payload && typeof payload === "object" && "amount" in payload) {
    const amount = (payload as { amount?: unknown }).amount;
    return typeof amount === "number" ? amount : 0;
  }
  return 0;
}

interface CashFigures {
  openingBalance: number;
  imprestReceived: number;
  totalFundsAvailable: number;
  totalExpenditure: number;
  closingBalance: number;
  siteSpecificExpenditure: number;
  overheadExpenditure: number;
  ofWhichFuel: number;
  indicators: {
    siteSpecificPct: number;
    overheadPct: number;
    fuelPct: number;
    fundsUtilisedPct: number;
    daysWithActivity: number;
    avgExpenditurePerActiveDay: number;
    entriesRecorded: number;
  };
}

/** Renders one CashPositionFigures block — reused for both "selected period" and "to date" (they're the same shape by design, see financialService.getCashPosition). */
function CashFiguresPanel({ title, figures }: { title: string; figures: CashFigures }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <StatRow>
        <StatTile label="Opening balance" value={formatCompactCurrency(figures.openingBalance)} />
        <StatTile label="Imprest received" value={formatCompactCurrency(figures.imprestReceived)} />
        <StatTile label="Total funds available" value={formatCompactCurrency(figures.totalFundsAvailable)} />
        <StatTile label="Total expenditure" value={formatCompactCurrency(figures.totalExpenditure)} />
        <StatTile
          label="Closing balance"
          value={formatCompactCurrency(figures.closingBalance)}
          accent={figures.closingBalance < 0 ? "bad" : "good"}
        />
      </StatRow>
      <StatRow>
        <StatTile
          label="Site-specific spend"
          value={formatCompactCurrency(figures.siteSpecificExpenditure)}
          sublabel={`${figures.indicators.siteSpecificPct.toFixed(1)}% of spend`}
        />
        <StatTile
          label="Overhead spend"
          value={formatCompactCurrency(figures.overheadExpenditure)}
          sublabel={`${figures.indicators.overheadPct.toFixed(1)}% of spend`}
        />
        <StatTile
          label="Of which fuel"
          value={formatCompactCurrency(figures.ofWhichFuel)}
          sublabel={`${figures.indicators.fuelPct.toFixed(1)}% of spend`}
        />
        <StatTile label="Funds utilised" value={`${figures.indicators.fundsUtilisedPct.toFixed(1)}%`} />
        <StatTile label="Days with activity" value={String(figures.indicators.daysWithActivity)} />
        <StatTile label="Avg / active day" value={formatCompactCurrency(figures.indicators.avgExpenditurePerActiveDay)} />
        <StatTile label="Entries recorded" value={String(figures.indicators.entriesRecorded)} />
      </StatRow>
    </div>
  );
}

interface BreakdownRow {
  key: string;
  label: string;
  toDateAmount: number;
}

/** Shared "to-date" breakdown card — used for by-location (doubles as cost-per-location), by-category and fuel-by-vehicle-type. */
function BreakdownSection({
  title,
  subtitle,
  rows,
  isLoading,
  emptyTitle,
  labelFor,
}: {
  title: string;
  subtitle?: string;
  rows: BreakdownRow[] | undefined;
  isLoading: boolean;
  emptyTitle: string;
  labelFor?: (row: BreakdownRow) => string;
}) {
  const items = (rows ?? [])
    .filter((r) => r.toDateAmount !== 0)
    .map((r) => ({ id: r.key, label: labelFor ? labelFor(r) : r.label, value: r.toDateAmount }));

  return (
    <div className="rounded-md border p-4">
      <p className={subtitle ? "text-xs font-medium text-muted-foreground" : "mb-3 text-xs font-medium text-muted-foreground"}>{title}</p>
      {subtitle && <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <BarChart items={items} formatValue={(n) => formatCurrency(n)} />
      )}
    </div>
  );
}

export default function FinancialDashboardPage() {
  const { user } = useAuth();
  const { siteTermLabel } = useCompanyConfig();
  const utils = trpc.useUtils();

  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [scopeKey, setScopeKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const scope = scopeArgs(scopeKey);

  const { periodStart, periodEnd } = useMemo(() => monthRange(monthValue), [monthValue]);

  const scopes = useScopeOptions();
  const { data: projects } = trpc.project.list.useQuery();

  const cashPosition = trpc.financial.cashPosition.useQuery({ ...scope, periodStart, periodEnd });
  const byLocation = trpc.financial.expenditureByLocation.useQuery({ ...scope, periodStart, periodEnd });
  const byCategory = trpc.financial.expenditureByCategory.useQuery({ ...scope, periodStart, periodEnd });
  const byFuelType = trpc.financial.fuelByVehicleType.useQuery({ ...scope, periodStart, periodEnd });
  const monthlyTrend = trpc.financial.monthlyTrend.useQuery({ ...scope, months: 12 });
  const recentTransactions = trpc.financial.recentTransactions.useQuery({ ...scope, limit: 20 });
  const unusualExpenses = trpc.financial.unusualExpenses.useQuery({ ...scope });
  const incompleteRecords = trpc.financial.incompleteRecords.useQuery({ ...scope });
  const costToComplete = trpc.budget.listCostToCompleteForAllSites.useQuery();
  const projectRollup = trpc.budget.projectRollup.useQuery({ projectId }, { enabled: !!projectId });

  const setOpeningBalance = trpc.financial.setOpeningCashBalance.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.financial.cashPosition.invalidate(), utils.financial.monthlyTrend.invalidate()]);
      setObAmount("");
    },
  });

  const [obScopeKey, setObScopeKey] = useState("");
  const [obAmount, setObAmount] = useState("");
  const [obDate, setObDate] = useState(todayIso);

  const flaggedChecks = Object.entries(cashPosition.data?.balanceChecks ?? {}).filter(([, v]) => Math.abs(v) > 0.5);

  const budgetChartItems = (costToComplete.data ?? [])
    .filter((c) => c.costToComplete.budgetAmount !== null)
    .map((c) => ({
      id: entryScope(c).id,
      label: entryScope(c).name,
      value: c.costToComplete.committedSpend,
      reference: c.costToComplete.budgetAmount ?? undefined,
      status: (c.costToComplete.remaining ?? 0) < 0 ? ("bad" as const) : ("good" as const),
    }));

  const trendItems = (monthlyTrend.data ?? []).map((row) => ({
    id: String(row.monthStart),
    label: row.month,
    value: row.expenditure,
  }));

  type RecentTx = NonNullable<typeof recentTransactions.data>[number];
  const txColumns: DataTableColumn<RecentTx>[] = [
    { key: "paidAt", header: "Date", cell: (r) => formatDateTime(r.paidAt) },
    { key: "paidTo", header: "Paid to", cell: (r) => r.paidTo },
    { key: "description", header: "Description", cell: (r) => r.description },
    { key: "category", header: "Category", cell: (r) => CATEGORY_LABELS[r.category] ?? r.category },
    { key: "site", header: siteTermLabel, cell: (r) => scopeLabel(r) },
    { key: "where", header: "Location / asset", cell: (r) => r.location?.name ?? r.asset?.name ?? "—" },
    { key: "amount", header: "Amount", cell: (r) => formatCurrency(r.amount), numeric: true },
    { key: "receipt", header: "Receipt", cell: (r) => (r.hasReceipt ? "✓" : "—") },
  ];

  type MonthlyRow = NonNullable<typeof monthlyTrend.data>[number];
  const trendColumns: DataTableColumn<MonthlyRow>[] = [
    { key: "month", header: "Month", cell: (r) => r.month },
    { key: "expenditure", header: "Expenditure", cell: (r) => formatCurrency(r.expenditure), numeric: true },
    {
      key: "closingBalance",
      header: "Closing balance",
      cell: (r) => formatCurrency(r.closingBalance),
      numeric: true,
      cellClassName: (r) => (r.closingBalance < 0 ? "text-status-bad" : undefined),
    },
  ];

  const pendingApprovalTotal = (incompleteRecords.data?.pendingBimpeApprovals ?? []).reduce(
    (sum, action) => sum + payloadAmount(action.payload),
    0,
  );

  const scopeNameById = new Map(scopes.map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold">Financial dashboard</h1>
          <p className="text-sm text-muted-foreground">Cash position, expenditure and budget rollups for the selected period.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={scopeKey}
            onChange={(e) => setScopeKey(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All {siteTermLabel.toLowerCase()}s</option>
            {scopes.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      {flaggedChecks.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-status-warn/40 bg-status-warn/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warn" />
          <div>
            <p className="font-medium text-status-warn">Balance check discrepancy — these should read ~0</p>
            <ul className="mt-1 list-disc pl-4 text-muted-foreground">
              {flaggedChecks.map(([label, value]) => (
                <li key={label}>
                  {label}: {formatCurrency(value)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-md border p-4">
        {cashPosition.isLoading || !cashPosition.data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col gap-6">
            <CashFiguresPanel title="Cash position — selected period" figures={cashPosition.data.selectedPeriod} />
            <div className="border-t pt-4">
              <CashFiguresPanel title="Cash position — to date" figures={cashPosition.data.toDate} />
            </div>
          </div>
        )}
      </div>

      <BreakdownSection
        title={`Expenditure by ${siteTermLabel.toLowerCase()} location (cost per location)`}
        subtitle="To-date totals, including unattributed overhead spend."
        rows={byLocation.data}
        isLoading={byLocation.isLoading}
        emptyTitle="No expenditure recorded yet"
      />

      <BreakdownSection
        title="Expenditure by category"
        rows={byCategory.data}
        isLoading={byCategory.isLoading}
        emptyTitle="No expenditure recorded yet"
        labelFor={(r) => CATEGORY_LABELS[r.key] ?? r.label}
      />

      <BreakdownSection
        title="Fuel by vehicle type"
        rows={byFuelType.data}
        isLoading={byFuelType.isLoading}
        emptyTitle="No fuel expenditure recorded yet"
      />

      <div className="rounded-md border p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Budget vs. actual — by {siteTermLabel.toLowerCase()}</p>
        {costToComplete.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : budgetChartItems.length === 0 ? (
          <EmptyState
            title="No budgets set yet"
            description={`Set a budget per ${siteTermLabel.toLowerCase()} on the Budgets page to compare against actual spend here.`}
          />
        ) : (
          <BarChart items={budgetChartItems} referenceLabel="Budget" formatValue={(n) => formatCurrency(n)} />
        )}

        {(projects ?? []).length > 0 && (
          <div className="mt-4 border-t pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Budget vs. actual — by project</p>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Select a project…</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {!projectId ? (
              <p className="text-sm text-muted-foreground">Pick a project to see its rollup across {siteTermLabel.toLowerCase()}s.</p>
            ) : projectRollup.isLoading || !projectRollup.data ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="flex flex-col gap-3">
                <StatRow>
                  <StatTile
                    label="Total budget"
                    value={projectRollup.data.totalBudget !== null ? formatCompactCurrency(projectRollup.data.totalBudget) : "—"}
                  />
                  <StatTile label="Committed spend" value={formatCompactCurrency(projectRollup.data.totalCommittedSpend)} />
                  <StatTile
                    label="Remaining"
                    value={projectRollup.data.totalRemaining !== null ? formatCompactCurrency(projectRollup.data.totalRemaining) : "—"}
                    accent={
                      projectRollup.data.totalRemaining !== null
                        ? projectRollup.data.totalRemaining < 0
                          ? "bad"
                          : "good"
                        : "neutral"
                    }
                  />
                  <StatTile
                    label="% used"
                    value={projectRollup.data.percentUsed !== null ? `${projectRollup.data.percentUsed.toFixed(1)}%` : "—"}
                  />
                </StatRow>
                {projectRollup.data.roads.length > 0 && (
                  <BarChart
                    items={projectRollup.data.roads.map((s) => ({
                      id: s.road.id,
                      label: s.road.name,
                      value: s.costToComplete.committedSpend,
                      reference: s.costToComplete.budgetAmount ?? undefined,
                      status: (s.costToComplete.remaining ?? 0) < 0 ? ("bad" as const) : ("good" as const),
                    }))}
                    referenceLabel="Budget"
                    formatValue={(n) => formatCurrency(n)}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Monthly trend — last 12 months</p>
        {monthlyTrend.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : trendItems.length === 0 ? (
          <EmptyState title="No trend data yet" />
        ) : (
          <div className="flex flex-col gap-4">
            <BarChart items={trendItems} formatValue={(n) => formatCompactCurrency(n)} />
            <DataTable
              columns={trendColumns}
              rows={monthlyTrend.data ?? []}
              rowKey={(r) => r.month}
              emptyTitle="No trend data yet"
            />
          </div>
        )}
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Recent transactions</p>
        {recentTransactions.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <DataTable columns={txColumns} rows={recentTransactions.data ?? []} rowKey={(r) => r.id} emptyTitle="No transactions recorded yet" />
        )}
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Unusual / high-value expenses</p>
        {unusualExpenses.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (unusualExpenses.data ?? []).length === 0 ? (
          <p className="text-sm text-status-good">Nothing flagged — spend is within its recent baseline.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(unusualExpenses.data ?? []).map((u) => (
              <li key={u.expense.id} className="rounded-md border border-status-warn/30 bg-status-warn/5 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {u.expense.paidTo} — {formatCurrency(u.expense.amount)}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(u.expense.paidAt)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{u.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Outstanding & incomplete records</p>
        {incompleteRecords.isLoading || !incompleteRecords.data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <StatRow>
              <StatTile
                label="Missing receipts"
                value={String(incompleteRecords.data.missingReceipts.length)}
                accent={incompleteRecords.data.missingReceipts.length > 0 ? "warn" : "good"}
              />
              <StatTile
                label="Bimpe proposals awaiting approval"
                value={String(incompleteRecords.data.pendingBimpeApprovals.length)}
                sublabel={pendingApprovalTotal > 0 ? `totaling ${formatCurrency(pendingApprovalTotal)}` : undefined}
                accent={incompleteRecords.data.pendingBimpeApprovals.length > 0 ? "warn" : "good"}
              />
              <StatTile
                label="Unreconciled fund requests"
                value={String(incompleteRecords.data.overdueFundRequests.length)}
                accent={incompleteRecords.data.overdueFundRequests.length > 0 ? "warn" : "good"}
              />
            </StatRow>

            {incompleteRecords.data.overdueFundRequests.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 divide-y">
                {incompleteRecords.data.overdueFundRequests.map((fr) => {
                  const spent = fr.expenses.reduce((sum, e) => sum + e.amount, 0);
                  const unreconciled = (fr.amountReleased ?? 0) - spent;
                  return (
                    <li key={fr.id} className="flex items-center justify-between pt-1.5 text-sm first:pt-0">
                      <span>
                        {fr.purpose} — {scopeNameById.get(fr.roadId ?? fr.facilityId ?? "") ?? "—"}
                      </span>
                      <span className="tabular-nums text-status-warn">{formatCurrency(unreconciled)} unreconciled</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {user?.role === "OWNER_ADMIN" && (
        <form
          className="flex flex-wrap items-end gap-3 rounded-md border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (obScopeKey && obAmount) {
              setOpeningBalance.mutate({ ...scopeArgs(obScopeKey), amount: Number(obAmount), asOfDate: new Date(obDate) });
            }
          }}
        >
          <div className="w-full">
            <p className="text-xs font-medium text-muted-foreground">Set opening cash balance (one-time onboarding value)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-site">{siteTermLabel}</Label>
            <select
              id="ob-site"
              value={obScopeKey}
              onChange={(e) => setObScopeKey(e.target.value)}
              className="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm"
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
            <Label htmlFor="ob-amount">Amount</Label>
            <Input id="ob-amount" type="number" min="0" step="0.01" value={obAmount} onChange={(e) => setObAmount(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-date">As of date</Label>
            <input
              id="ob-date"
              type="date"
              value={obDate}
              onChange={(e) => setObDate(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <Button type="submit" disabled={!obScopeKey || !obAmount || setOpeningBalance.isPending}>
            {setOpeningBalance.isPending ? "Saving…" : "Save"}
          </Button>
          {setOpeningBalance.isSuccess && <p className="text-xs text-status-good">Saved.</p>}
        </form>
      )}
    </div>
  );
}
