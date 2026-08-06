import { cn } from "@/lib/utils";
import type { Status } from "@/components/data/StatusBadge";

const STATUS_BAR_CLASSES: Record<Status, string> = {
  good: "bg-status-good",
  warn: "bg-status-warn",
  bad: "bg-status-bad",
  neutral: "bg-foreground/70",
};

export interface BarChartItem {
  id: string;
  label: string;
  value: number;
  reference?: number;
  status?: Status;
}

interface BarChartProps {
  items: BarChartItem[];
  referenceLabel?: string;
  formatValue?: (n: number) => string;
}

/**
 * Horizontal reference-line bar chart — "Δ to target" job (dataviz spec's
 * choosing-a-form table): one bar per entity, colored by its status, with a
 * dashed reference line for the target/threshold rather than a second series.
 * Bar ≤24px thick, 4px rounded tip, hover/focus tooltip on the whole row.
 */
export function BarChart({ items, referenceLabel, formatValue = String }: BarChartProps) {
  if (items.length === 0) return null;

  const max = Math.max(...items.map((i) => Math.max(i.value, i.reference ?? 0)), 1) * 1.1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const valuePct = Math.min((item.value / max) * 100, 100);
          const refPct = item.reference !== undefined ? Math.min((item.reference / max) * 100, 100) : null;
          const status = item.status ?? "neutral";
          const formattedValue = formatValue(item.value);
          const tooltip =
            item.reference !== undefined
              ? `${formattedValue} — ${item.label} (${referenceLabel ?? "target"}: ${formatValue(item.reference)})`
              : `${formattedValue} — ${item.label}`;

          return (
            <div
              key={item.id}
              className="group/row relative flex items-center gap-3"
              tabIndex={0}
              role="img"
              aria-label={tooltip}
            >
              <span className="w-24 shrink-0 truncate text-xs text-muted-foreground sm:w-32">{item.label}</span>
              <div className="relative h-5 flex-1">
                {refPct !== null && (
                  <div
                    className="absolute inset-y-[-2px] border-l border-dashed border-foreground/40"
                    style={{ left: `${refPct}%` }}
                  />
                )}
                <div
                  className={cn(
                    "h-5 rounded-r-[4px] transition-[filter] duration-150",
                    STATUS_BAR_CLASSES[status],
                    "group-hover/row:brightness-110 group-focus-visible/row:brightness-110",
                  )}
                  style={{ width: `${valuePct}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs tabular-nums">{formattedValue}</span>

              <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs opacity-0 shadow-md transition-opacity group-hover/row:opacity-100 group-focus-visible/row:opacity-100">
                <strong className="tabular-nums">{formattedValue}</strong>{" "}
                <span className="text-muted-foreground">
                  — {item.label}
                  {item.reference !== undefined && ` · ${referenceLabel ?? "target"}: ${formatValue(item.reference)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {referenceLabel && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-0 w-3 border-t border-dashed border-foreground/40" />
          {referenceLabel}
        </div>
      )}
    </div>
  );
}
