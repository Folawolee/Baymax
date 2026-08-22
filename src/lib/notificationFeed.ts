"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { scopeHref } from "@/lib/scopes";

export interface FeedItem {
  id: string;
  status: "bad" | "warn";
  title: string;
  description: string;
  href?: string;
  /** Real Notification rows can be marked read on dismiss; synthesized ones (maintenance/QC) have no backing row. */
  isSynthetic: boolean;
}

const STORAGE_KEY = "baymax:dismissedAlerts";

/**
 * Synthetic alerts have no server-side row to mark read, so a dismissal has to
 * live in the browser or it comes straight back on the next render. Persisting
 * to localStorage (rather than React state) is what makes a dismissal survive
 * navigation and a full reload.
 *
 * Every accessor is wrapped: private windows, cleared site data and
 * storage-blocking browsers all throw rather than returning empty.
 */
function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable — dismissal still applies for this session */
  }
}

function describeNotification(n: { id: string; type: string; payload: unknown }): FeedItem | null {
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
        title: `${payload.facilityName ?? payload.siteName} is behind plan`,
        description: `${Math.round(payload.actualToDate as number)} vs pro-rated target ${Math.round(payload.proRatedTarget as number)} (${(payload.variancePct as number).toFixed(1)}% variance).`,
        href: scopeHref(payload),
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
    case "WORK_ITEM_OVERDUE":
      return {
        id: n.id,
        status: payload.overdue ? "bad" : "warn",
        title: `${payload.title} is ${payload.overdue ? "overdue" : "due soon"}`,
        description: `At ${payload.locationName ?? "site"}, assigned to ${payload.assignedToName ?? "someone"}.`,
        href: scopeHref(payload),
        isSynthetic: false,
      };
    case "MATERIAL_OVERUSE":
      return {
        id: n.id,
        status: "warn",
        title: `${payload.title} is over its planned material`,
        description: `${payload.actualQty}/${payload.plannedQty} used at ${payload.locationName}.`,
        href: scopeHref(payload),
        isSynthetic: false,
      };
    case "WASTAGE_HIGH":
      return {
        id: n.id,
        status: "warn",
        title: `High wastage on ${payload.materialName}`,
        description: `${Math.round(payload.wastagePct as number)}% wasted at ${payload.locationName}.`,
        href: "/materials/ledger",
        isSynthetic: false,
      };
    case "BUDGET_OVERRUN":
      return {
        id: n.id,
        status: "bad",
        title: "Budget overrun",
        description:
          typeof payload.workItemId === "string"
            ? `${payload.title} is over its budgeted cost.`
            : `Fund request "${payload.purpose}" has unreconciled spend.`,
        href: typeof payload.workItemId === "string" ? scopeHref(payload) : "/financial/fund-requests",
        isSynthetic: false,
      };
    case "PURCHASE_DELAYED":
      return {
        id: n.id,
        status: "warn",
        title: "A purchase is delayed",
        description: `Delivery from ${payload.vendorName} has passed its expected date.`,
        href: typeof payload.purchaseOrderId === "string" ? `/procurement/${payload.purchaseOrderId}` : undefined,
        isSynthetic: false,
      };
    case "FUND_REQUEST_PENDING":
      return {
        id: n.id,
        status: "warn",
        title: "A fund request is waiting",
        description: `${payload.purpose} at ${payload.siteName ?? "site"}.`,
        href: "/financial/fund-requests",
        isSynthetic: false,
      };
    case "MISSING_RECEIPT":
      return {
        id: n.id,
        status: "warn",
        title: "Expense recorded without a receipt",
        description: `${payload.description ?? "An expense"} has no attachment on file.`,
        href: "/financial/dashboard",
        isSynthetic: false,
      };
    case "NO_RECENT_UPDATE":
      return {
        id: n.id,
        status: "warn",
        title: `${payload.roadName ?? "A road"} has gone quiet`,
        description: "No usage or daily note logged in the last few days.",
        href: scopeHref(payload),
        isSynthetic: false,
      };
    default:
      return null;
  }
}

/**
 * Single source of truth for the alert feed, shared by the header bell and the
 * toast stack so dismissing in one place immediately empties the other.
 */
export function useNotificationFeed() {
  const { data: notifications } = trpc.notification.list.useQuery({ unreadOnly: true }, { refetchInterval: 30_000 });
  const { data: maintenanceSummary } = trpc.asset.maintenanceSummary.useQuery();
  const { data: batchSummaries } = trpc.productionBatch.summaryForAllFacilities.useQuery();
  const utils = trpc.useUtils();
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => utils.notification.list.invalidate(),
  });

  // Start empty so server and first client render agree, then hydrate from
  // storage — reading localStorage during render would cause a hydration mismatch.
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const items = useMemo(() => {
    const fromNotifications = (notifications ?? [])
      .map(describeNotification)
      .filter((i): i is FeedItem => i !== null);

    const synthetic: FeedItem[] = [];
    const overdue = maintenanceSummary?.overdueScheduled ?? 0;
    if (overdue > 0) {
      synthetic.push({
        // The count is part of the id on purpose: dismissing "3 overdue" stays
        // dismissed, but the alert legitimately returns if it worsens to 4.
        id: `overdue-maintenance:${overdue}`,
        status: "bad",
        title: `${overdue} scheduled maintenance item(s) overdue`,
        description: "Scheduled maintenance past its date and still open.",
        href: "/assets",
        isSynthetic: true,
      });
    }
    for (const { facility, summary } of batchSummaries ?? []) {
      if (summary.awaitingQcCount > 0) {
        synthetic.push({
          id: `qc-${facility.id}:${summary.awaitingQcCount}`,
          status: "warn",
          title: `${summary.awaitingQcCount} batch(es) awaiting QC at ${facility.name}`,
          description: "Weighed-out trucks with no lab quality result recorded yet.",
          href: `/production/${facility.id}`,
          isSynthetic: true,
        });
      }
    }

    return [...synthetic, ...fromNotifications];
  }, [notifications, maintenanceSummary, batchSummaries]);

  const visible = useMemo(() => items.filter((i) => !dismissed.has(i.id)), [items, dismissed]);

  const dismiss = useCallback(
    (item: FeedItem) => {
      setDismissed((prev) => {
        const next = new Set(prev).add(item.id);
        writeDismissed(next);
        return next;
      });
      if (!item.isSynthetic) markRead.mutate({ id: item.id });
    },
    [markRead],
  );

  const clearAll = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const item of visible) next.add(item.id);
      writeDismissed(next);
      return next;
    });
    for (const item of visible) {
      if (!item.isSynthetic) markRead.mutate({ id: item.id });
    }
  }, [visible, markRead]);

  return { items: visible, count: visible.length, dismiss, clearAll };
}
