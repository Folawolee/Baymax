import { cn } from "@/lib/utils";

export interface MetricItem {
  label: string;
  value: string;
  /** Quiet supporting line: counts, utilisation, variance. */
  context?: string;
  /** Only set when the context line is a genuine variance worth tinting. */
  tone?: "neutral" | "good" | "warn";
}

/**
 * A horizontal metric band, not a row of floating cards: numbers dominate,
 * labels stay quiet, and separators are hairlines rather than borders around
 * each figure.
 */
export function MetricBand({ items, className }: { items: MetricItem[]; className?: string }) {
  return (
    <section className={cn("grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4 lg:gap-x-0 lg:divide-x", className)}>
      {items.map((m, i) => (
        <div key={m.label} className={cn("min-w-0", i > 0 && "lg:pl-8")}>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
          <p className="mt-1.5 font-heading text-3xl font-semibold tabular-nums tracking-tight">{m.value}</p>
          {m.context && (
            <p
              className={cn(
                "mt-1 truncate text-xs",
                m.tone === "warn" ? "text-status-warn" : m.tone === "good" ? "text-status-good" : "text-muted-foreground",
              )}
            >
              {m.context}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
