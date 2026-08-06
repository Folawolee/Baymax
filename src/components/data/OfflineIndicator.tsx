import { WifiOff, RefreshCw } from "lucide-react";
import { useOfflineQueue } from "@/lib/offlineQueue";

/** Visible offline state + queue count (§7/§9) — never leave the user wondering if their tap registered. */
export function OfflineIndicator() {
  const { isOnline, pending } = useOfflineQueue();

  if (isOnline && pending.length === 0) return null;

  return (
    <div className="flex items-center gap-2 border-b bg-status-warn px-3 py-1.5 text-xs font-medium text-status-warn-foreground">
      {isOnline ? <RefreshCw className="size-3.5 animate-spin" /> : <WifiOff className="size-3.5" />}
      {isOnline
        ? `Back online — syncing ${pending.length} ${pending.length === 1 ? "entry" : "entries"}...`
        : `Offline — ${pending.length} ${pending.length === 1 ? "entry" : "entries"} waiting to sync`}
    </div>
  );
}
