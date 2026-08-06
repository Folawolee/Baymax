import { cn } from "@/lib/utils";

export type Status = "good" | "warn" | "bad" | "neutral";

const STATUS_CLASSES: Record<Status, string> = {
  good: "bg-status-good text-status-good-foreground",
  warn: "bg-status-warn text-status-warn-foreground",
  bad: "bg-status-bad text-status-bad-foreground",
  neutral: "bg-muted text-muted-foreground",
};

/** Text label is mandatory — color never carries meaning alone (WCAG 1.4.1, build prompt UI spec §4/§12). */
export function StatusBadge({ status, label, className }: { status: Status; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Full-bleed cell coloring (Katana pattern, §3/§7) — status lives in the cell itself, not a separate icon column. */
export function statusCellClass(status: Status): string {
  return cn("px-3 py-2 font-medium", STATUS_CLASSES[status]);
}
