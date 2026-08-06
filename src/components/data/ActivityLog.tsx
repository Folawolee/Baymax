import { formatDateTime } from "@/lib/format";
import { EmptyState } from "./EmptyState";

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  timestamp: string | Date;
}

/**
 * "Accountability by default" made visible (build prompt §4, UI spec §7) —
 * every delivery, edit and approval on a record, who did it, when. Derived
 * from the record's own relations by the caller, not a separate audit-log fetch.
 */
export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  if (sorted.length === 0) {
    return <EmptyState title="No activity yet" />;
  }

  return (
    <div className="rounded-md border">
      <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Activity</div>
      <ul className="divide-y">
        {sorted.map((entry) => (
          <li key={entry.id} className="px-3 py-2 text-sm">
            <p>
              <span className="font-medium">{entry.actor}</span> {entry.action}
            </p>
            <p className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
