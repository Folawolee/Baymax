import { cn } from "@/lib/utils";

export type Severity = "good" | "warn" | "bad" | "neutral";

const DOT: Record<Severity, string> = {
  good: "bg-status-good",
  warn: "bg-status-warn",
  bad: "bg-status-bad",
  neutral: "bg-muted-foreground/50",
};

/**
 * The executive severity treatment: a small dot plus plain text. Deliberately
 * not StatusBadge — a filled pill shouts, and on a portfolio view most rows are
 * fine. Colour never carries the meaning alone; the label always states it.
 */
export function StatusIndicator({
  severity,
  label,
  muted,
  className,
}: {
  severity: Severity;
  label: string;
  /** Dim the label when the state is unremarkable, so exceptions stand out. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT[severity])} />
      <span className={cn("text-sm", muted ? "text-muted-foreground" : "text-foreground")}>{label}</span>
    </span>
  );
}

/** A thin, precise progress rule — never a thick decorative bar. */
export function ProgressRule({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="w-9 shrink-0 text-sm tabular-nums">{Math.round(value)}%</span>
      <span className="h-0.5 w-full min-w-10 max-w-24 bg-border">
        <span className="block h-full bg-foreground/60" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </span>
    </div>
  );
}
