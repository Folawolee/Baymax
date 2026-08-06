"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface PopupItem {
  id: string;
  status: "bad" | "warn";
  title: string;
  description: string;
  href?: string;
  /** Real Notification rows can be marked read on dismiss; synthesized ones (maintenance/QC) have no backing row. */
  isSynthetic: boolean;
}

function describeNotification(n: { id: string; type: string; payload: unknown }): PopupItem | null {
  const payload = (n.payload ?? {}) as Record<string, unknown>;

  switch (n.type) {
    case "LOW_STOCK":
      return {
        id: n.id,
        status: "bad",
        title: `${payload.materialName} is below your reorder point`,
        description: `${payload.quantity} left at ${payload.locationName} (threshold ${payload.threshold}).`,
        href: typeof payload.materialId === "string" ? `/materials/${payload.materialId}` : undefined,
        isSynthetic: false,
      };
    case "DELIVERY_RISK":
      return {
        id: n.id,
        status: payload.overdue ? "bad" : "warn",
        title: payload.overdue ? "A delivery is overdue" : "A delivery is approaching its due date",
        description: `From ${payload.vendorName} (status: ${String(payload.status).toLowerCase().replace("_", " ")}).`,
        href: typeof payload.purchaseOrderId === "string" ? `/procurement/${payload.purchaseOrderId}` : undefined,
        isSynthetic: false,
      };
    case "BEHIND_PLAN":
      return {
        id: n.id,
        status: "bad",
        title: `${payload.siteName} is behind plan`,
        description: `${Math.round(payload.actualToDate as number)} vs pro-rated target ${Math.round(payload.proRatedTarget as number)} (${(payload.variancePct as number).toFixed(1)}% variance).`,
        href: typeof payload.siteId === "string" ? `/production/${payload.siteId}` : undefined,
        isSynthetic: false,
      };
    case "APPROVAL_READY":
      return {
        id: n.id,
        status: "warn",
        title: "A purchase order is ready for approval",
        description: `Waiting on ${(payload.requiredRoles as string[] | undefined)?.join(", ") ?? "an approver"}.`,
        href: "/procurement/approvals",
        isSynthetic: false,
      };
    default:
      return null;
  }
}

/** Fixed top-right stack of dismissible alert cards — the "behind/below" items pulled out of the dashboard's main flow. */
export function NotificationPopups() {
  const { data: notifications } = trpc.notification.list.useQuery({ unreadOnly: true }, { refetchInterval: 30_000 });
  const { data: maintenanceSummary } = trpc.asset.maintenanceSummary.useQuery();
  const { data: batchSummaries } = trpc.productionBatch.summaryForAllSites.useQuery();
  const markRead = trpc.notification.markRead.useMutation();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const items = useMemo(() => {
    const fromNotifications = (notifications ?? [])
      .map(describeNotification)
      .filter((i): i is PopupItem => i !== null);

    const synthetic: PopupItem[] = [];
    if ((maintenanceSummary?.overdueScheduled ?? 0) > 0) {
      synthetic.push({
        id: "overdue-maintenance",
        status: "bad",
        title: `${maintenanceSummary!.overdueScheduled} scheduled maintenance item(s) overdue`,
        description: "Scheduled maintenance past its date and still open.",
        href: "/assets",
        isSynthetic: true,
      });
    }
    for (const { site, summary } of batchSummaries ?? []) {
      if (summary.awaitingQcCount > 0) {
        synthetic.push({
          id: `qc-${site.id}`,
          status: "warn",
          title: `${summary.awaitingQcCount} batch(es) awaiting QC at ${site.name}`,
          description: "Weighed-out trucks with no lab quality result recorded yet.",
          href: `/production/${site.id}`,
          isSynthetic: true,
        });
      }
    }

    return [...synthetic, ...fromNotifications];
  }, [notifications, maintenanceSummary, batchSummaries]);

  const visible = items.filter((i) => !dismissed.has(i.id)).slice(0, 5);

  function dismiss(item: PopupItem) {
    setDismissed((d) => new Set(d).add(item.id));
    if (!item.isSynthetic) markRead.mutate({ id: item.id });
  }

  if (visible.length === 0) return null;

  return (
    <div className="fixed right-4 top-16 z-40 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {visible.map((item) => {
        const content = (
          <>
            <p className="pr-4 text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </>
        );
        return (
          <div
            key={item.id}
            className={cn(
              "relative rounded-md border bg-popover p-3 shadow-md",
              item.status === "bad" ? "border-status-bad/40" : "border-status-warn/40",
            )}
          >
            <button
              onClick={() => dismiss(item)}
              aria-label="Dismiss"
              className="absolute right-2 top-2 flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-3.5" />
            </button>
            {item.href ? (
              <Link href={item.href} className="block hover:opacity-80">
                {content}
              </Link>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}
