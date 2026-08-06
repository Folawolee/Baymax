import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

export interface NetFlowBucket {
  weekStart: string | Date;
  cashIn: number;
  cashOut: number;
  net: number;
}

interface NetFlowChartProps {
  buckets: NetFlowBucket[];
  formatValue: (n: number) => string;
}

/**
 * Diverging column chart around a zero baseline — the "Δ to target" job for
 * cash flow (dataviz spec's choosing-a-form table), not a dual-axis in/out
 * pair. Color reuses the app's status palette (good = net positive, bad =
 * net negative) rather than a generic diverging hue pair, consistent with
 * how status color is used everywhere else in this product.
 */
export function NetFlowChart({ buckets, formatValue }: NetFlowChartProps) {
  if (buckets.length === 0) return null;

  const maxAbs = Math.max(...buckets.map((b) => Math.abs(b.net)), 1);
  const columnHeight = 96; // px available above and below the baseline, each

  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1" style={{ height: columnHeight * 2 + 56 }}>
      {buckets.map((bucket, i) => {
        const barHeight = Math.max((Math.abs(bucket.net) / maxAbs) * columnHeight, bucket.net === 0 ? 0 : 2);
        const isPositive = bucket.net >= 0;
        const tooltip = `${formatValue(bucket.net)} net — in ${formatValue(bucket.cashIn)}, out ${formatValue(bucket.cashOut)} (week of ${formatDate(bucket.weekStart)})`;

        return (
          <div
            key={i}
            className="group/col relative flex w-10 shrink-0 flex-col items-center"
            style={{ height: columnHeight * 2 + 40 }}
            tabIndex={0}
            role="img"
            aria-label={tooltip}
          >
            <div className="relative flex w-full flex-col justify-end" style={{ height: columnHeight }}>
              {isPositive && (
                <div
                  className="w-full rounded-t-[4px] bg-status-good transition-[filter] group-hover/col:brightness-110 group-focus-visible/col:brightness-110"
                  style={{ height: barHeight }}
                />
              )}
            </div>
            <div className="h-px w-full bg-foreground/30" />
            <div className="relative flex w-full flex-col" style={{ height: columnHeight }}>
              {!isPositive && (
                <div
                  className="w-full rounded-b-[4px] bg-status-bad transition-[filter] group-hover/col:brightness-110 group-focus-visible/col:brightness-110"
                  style={{ height: barHeight }}
                />
              )}
            </div>
            <span className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">
              {formatDate(bucket.weekStart).replace(/, \d{4}$/, "")}
            </span>

            <div
              className={cn(
                "pointer-events-none absolute left-1/2 z-10 w-max max-w-[160px] -translate-x-1/2 whitespace-normal rounded-md border bg-popover px-2 py-1 text-center text-xs opacity-0 shadow-md transition-opacity group-hover/col:opacity-100 group-focus-visible/col:opacity-100",
                isPositive ? "bottom-full mb-1" : "top-full mt-1",
              )}
            >
              <strong>{formatValue(bucket.net)}</strong> net
              <br />
              <span className="text-muted-foreground">
                in {formatValue(bucket.cashIn)} · out {formatValue(bucket.cashOut)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
