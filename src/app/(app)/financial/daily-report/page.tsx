"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useScopeOptions, scopeArgs } from "@/lib/scopes";
import { useCompanyConfig } from "@/lib/companyConfig";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { BarChart } from "@/components/charts/BarChart";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { EmptyState } from "@/components/data/EmptyState";
import { CATEGORY_LABELS } from "@/lib/expenseCategories";
import { formatCompactCurrency, formatCurrency, formatQty } from "@/lib/format";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface MaterialRow {
  material: string;
  qty: number;
  unit: string;
  location: string;
}

const materialColumns: DataTableColumn<MaterialRow>[] = [
  { key: "material", header: "Material", cell: (r) => r.material },
  { key: "qty", header: "Quantity", cell: (r) => formatQty(r.qty, r.unit), numeric: true },
  { key: "location", header: "Location", cell: (r) => r.location },
];

export default function DailyReportPage() {
  const { siteTermLabel } = useCompanyConfig();
  const [dateIso, setDateIso] = useState(todayIso);
  const [scopeKey, setScopeKey] = useState("");

  const scopes = useScopeOptions();
  const { data: report, isLoading } = trpc.dailyReport.get.useQuery({
    date: new Date(dateIso),
    ...scopeArgs(scopeKey),
  });

  const deltaPct = report?.dayOverDayDelta.totalSpentChangePct ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold">Daily report</h1>
          <p className="text-sm text-muted-foreground">A same-day snapshot of spend, materials and progress.</p>
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
            type="date"
            value={dateIso}
            onChange={(e) => setDateIso(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      {isLoading || !report ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <StatRow>
            <StatTile label="Total spent" value={formatCompactCurrency(report.totalSpent)} />
            <StatTile label="Imprest received" value={formatCompactCurrency(report.imprestReceived)} />
            <StatTile
              label="Closing balance"
              value={formatCompactCurrency(report.closingBalance)}
              accent={report.closingBalance < 0 ? "bad" : "good"}
            />
            <StatTile
              label="Vs. yesterday"
              value={deltaPct === null ? "—" : `${deltaPct >= 0 ? "↑" : "↓"} ${Math.abs(deltaPct).toFixed(1)}%`}
              sublabel={formatCurrency(report.dayOverDayDelta.totalSpentChangeAbs)}
              accent={deltaPct === null || deltaPct === 0 ? "neutral" : deltaPct > 0 ? "warn" : "good"}
            />
            <StatTile
              label="Missing receipts"
              value={String(report.missingReceipts)}
              accent={report.missingReceipts > 0 ? "warn" : "good"}
            />
          </StatRow>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Spend by location</p>
              {report.byLocation.length === 0 ? (
                <EmptyState title="No spend recorded for this day" />
              ) : (
                <BarChart
                  items={report.byLocation.map((r) => ({ id: r.key, label: r.label, value: r.selectedPeriodAmount }))}
                  formatValue={(n) => formatCurrency(n)}
                />
              )}
            </div>
            <div className="rounded-md border p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Spend by category</p>
              {report.byCategory.length === 0 ? (
                <EmptyState title="No spend recorded for this day" />
              ) : (
                <BarChart
                  items={report.byCategory.map((r) => ({
                    id: r.key,
                    label: CATEGORY_LABELS[r.key] ?? r.label,
                    value: r.selectedPeriodAmount,
                  }))}
                  formatValue={(n) => formatCurrency(n)}
                />
              )}
            </div>
          </div>

          <div className="rounded-md border p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">Materials used</p>
            <DataTable
              columns={materialColumns}
              rows={report.materialsUsed}
              rowKey={(r) => `${r.material}-${r.location}`}
              emptyTitle="No material usage logged for this day"
            />
          </div>

          <div className="rounded-md border p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">Work completed</p>
            {report.workCompleted.length === 0 ? (
              <EmptyState title="No work items completed on this day" />
            ) : (
              <ul className="flex flex-col gap-1.5 divide-y">
                {report.workCompleted.map((w, i) => (
                  <li key={`${w.workItem}-${w.site}-${i}`} className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-sm first:pt-0">
                    <span>
                      {w.workItem} — {w.site}
                      {w.location ? ` · ${w.location}` : ""}
                    </span>
                    {w.plannedQty != null && (
                      <span className="text-xs text-muted-foreground">
                        {formatQty(w.actualQty ?? 0)} of {formatQty(w.plannedQty)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">Budget utilization by {siteTermLabel.toLowerCase()}</p>
            {report.budgetUtilization.length === 0 ? (
              <EmptyState title="No sites to show" />
            ) : (
              <ul className="flex flex-col gap-1.5 divide-y">
                {report.budgetUtilization.map((b) => (
                  <li key={b.site} className="flex items-center justify-between pt-1.5 text-sm first:pt-0">
                    <span>{b.site}</span>
                    <span
                      className={
                        b.percentUsed === null
                          ? "tabular-nums text-muted-foreground"
                          : b.percentUsed >= 100
                            ? "tabular-nums text-status-bad"
                            : b.percentUsed >= 80
                              ? "tabular-nums text-status-warn"
                              : "tabular-nums text-status-good"
                      }
                    >
                      {b.percentUsed === null ? "No budget set" : `${b.percentUsed.toFixed(1)}%`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">Unusual transactions today</p>
            {report.unusualTransactions.length === 0 ? (
              <p className="text-sm text-status-good">Nothing flagged today.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {report.unusualTransactions.map((u) => (
                  <li key={u.expense.id} className="rounded-md border border-status-warn/30 bg-status-warn/5 p-3 text-sm">
                    <span className="font-medium">
                      {u.expense.paidTo} — {formatCurrency(u.expense.amount)}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">{u.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
