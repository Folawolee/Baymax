import { cn } from "@/lib/utils";
import type { Status } from "@/components/data/StatusBadge";

const ACCENT_CLASSES: Record<Status, string> = {
  good: "text-status-good",
  warn: "text-status-warn",
  bad: "text-status-bad",
  neutral: "text-foreground",
};

interface StatTileProps {
  label: string;
  value: string;
  accent?: Status;
  sublabel?: string;
}

/** Stat-tile contract (dataviz spec): sentence-case label, semibold proportional value, optional sublabel. */
export function StatTile({ label, value, accent = "neutral", sublabel }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-heading text-2xl font-semibold", ACCENT_CLASSES[accent])}>{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
