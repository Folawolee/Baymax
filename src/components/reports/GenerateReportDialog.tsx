"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useBimpePanel } from "@/lib/bimpePanelState";
import { useCompanyConfig } from "@/lib/companyConfig";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ReportType = "daily_operations" | "project_progress" | "financial" | "production" | "executive_summary";
type ScopeKind = "business" | "project" | "road" | "facility";
type Period = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";

const REPORT_TYPES: Array<{ value: ReportType; label: string; blurb: string }> = [
  { value: "daily_operations", label: "Daily operations", blurb: "Usage, notes and site activity for the period." },
  { value: "project_progress", label: "Project progress", blurb: "Work items, milestones and schedule position." },
  { value: "financial", label: "Financial summary", blurb: "Spend by category and location, against budget." },
  { value: "production", label: "Production", blurb: "Output against plan, internal and external." },
  { value: "executive_summary", label: "Executive summary", blurb: "Cross-module position and exceptions." },
];

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

/** A compact segmented control — cheaper to scan than a dropdown for 4-7 fixed options. */
function OptionRow<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            value === o.value
              ? "rounded-md border border-foreground/70 bg-foreground px-2.5 py-1.5 text-xs font-medium text-background"
              : "rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Report generation is a structured picker that composes a precise request and
 * hands it to the AI execution layer, which already has the tools to fulfil it.
 * The picker exists so the user never has to guess the phrasing; free-text
 * requests to the same layer keep working unchanged.
 */
export function GenerateReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { open: openBimpe } = useBimpePanel();
  const { productionEnabled } = useCompanyConfig();

  const [type, setType] = useState<ReportType>("executive_summary");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("business");
  const [scopeId, setScopeId] = useState("");
  const [period, setPeriod] = useState<Period>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: projects } = trpc.project.list.useQuery(undefined, { enabled: open && scopeKind === "project" });
  const { data: roads } = trpc.road.list.useQuery(undefined, { enabled: open && scopeKind === "road" });
  const { data: facilities } = trpc.productionFacility.list.useQuery(undefined, {
    enabled: open && scopeKind === "facility",
  });

  const scopeOptions = useMemo(() => {
    if (scopeKind === "project") return (projects ?? []).map((p) => ({ id: p.id, name: p.name }));
    if (scopeKind === "road") return (roads ?? []).map((r) => ({ id: r.id, name: r.name }));
    if (scopeKind === "facility") return (facilities ?? []).map((f) => ({ id: f.id, name: f.name }));
    return [];
  }, [scopeKind, projects, roads, facilities]);

  const selectedScopeName = scopeOptions.find((o) => o.id === scopeId)?.name ?? "";
  const needsScopePick = scopeKind !== "business";
  const customIncomplete = period === "custom" && (!from || !to);
  const canSubmit = !(needsScopePick && !scopeId) && !customIncomplete;

  const periodPhrase =
    period === "custom" ? `from ${from} to ${to}` : `for ${PERIODS.find((p) => p.value === period)?.label.toLowerCase()}`;

  const scopePhrase =
    scopeKind === "business"
      ? "the entire business"
      : `the ${scopeKind} "${selectedScopeName}"`;

  const typeLabel = REPORT_TYPES.find((t) => t.value === type)?.label.toLowerCase() ?? "report";
  const request = `Generate a ${typeLabel} report for ${scopePhrase} ${periodPhrase}.`;

  function submit() {
    if (!canSubmit) return;
    onOpenChange(false);
    openBimpe(request);
  }

  const availableTypes = productionEnabled ? REPORT_TYPES : REPORT_TYPES.filter((t) => t.value !== "production");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" /> Generate report
          </DialogTitle>
          <DialogDescription>Choose what to report on, then review the request before it runs.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-1">
          <div className="space-y-2">
            <Label>Report type</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {availableTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  aria-pressed={type === t.value}
                  className={
                    type === t.value
                      ? "rounded-md border border-foreground/40 bg-accent p-2.5 text-left"
                      : "rounded-md border bg-card p-2.5 text-left transition-colors hover:bg-accent/60"
                  }
                >
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Scope</Label>
            <OptionRow
              name="Scope"
              value={scopeKind}
              onChange={(v) => {
                setScopeKind(v);
                setScopeId("");
              }}
              options={[
                { value: "business", label: "Entire business" },
                { value: "project", label: "Project" },
                { value: "road", label: "Road" },
                ...(productionEnabled ? ([{ value: "facility", label: "Facility" }] as const) : []),
              ]}
            />
            {needsScopePick && (
              <select
                aria-label={`Select ${scopeKind}`}
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="">Select a {scopeKind}…</option>
                {scopeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <OptionRow name="Period" value={period} onChange={setPeriod} options={PERIODS} />
            {period === "custom" && (
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="reportFrom" className="text-xs text-muted-foreground">
                    From
                  </Label>
                  <Input id="reportFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reportTo" className="text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input id="reportTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Request</p>
            <p className="mt-1 text-sm">{request}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
