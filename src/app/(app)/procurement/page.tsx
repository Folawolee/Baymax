"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge, statusCellClass, type Status } from "@/components/data/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";

interface POStatusMeta {
  status: Status;
  label: string;
}

function statusMeta(status: string): POStatusMeta {
  switch (status) {
    case "DRAFT":
      return { status: "neutral", label: "Draft" };
    case "PENDING_APPROVAL":
      return { status: "warn", label: "Pending approval" };
    case "APPROVED":
      return { status: "warn", label: "Approved — awaiting delivery" };
    case "PARTIALLY_DELIVERED":
      return { status: "warn", label: "Partially delivered" };
    case "DELIVERED":
      return { status: "good", label: "Delivered" };
    case "REJECTED":
      return { status: "bad", label: "Rejected" };
    default:
      return { status: "neutral", label: status };
  }
}

export default function ProcurementPage() {
  const router = useRouter();
  const { data: orders, isLoading } = trpc.purchaseOrder.list.useQuery({});
  const { data: pendingApprovals } = trpc.approval.listPending.useQuery();
  const { data: summary } = trpc.insights.moduleSummary.useQuery({ module: "procurement" });
  // Lazy initializer, not a plain Date.now() call — reads "now" once, on
  // first render, without the render function itself being impure.
  const [now] = useState(() => Date.now());

  const openOrders = (orders ?? []).filter((po) => po.status !== "DELIVERED" && po.status !== "REJECTED");
  const openSpend = openOrders.reduce((sum, po) => sum + po.lines.reduce((s, l) => s + l.qty * l.price, 0), 0);
  const overdueCount = openOrders.filter(
    (po) => po.expectedDeliveryDate && new Date(po.expectedDeliveryDate).getTime() < now,
  ).length;

  const columns: DataTableColumn<NonNullable<typeof orders>[number]>[] = [
    { key: "vendor", header: "Vendor", cell: (po) => po.vendor.name },
    { key: "site", header: "Site", cell: (po) => po.site.name },
    {
      key: "total",
      header: "Total",
      cell: (po) => formatCurrency(po.lines.reduce((sum, l) => sum + l.qty * l.price, 0)),
      numeric: true,
    },
    { key: "expected", header: "Expected", cell: (po) => (po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : "—") },
    {
      key: "status",
      header: "Status",
      cell: (po) => {
        const meta = statusMeta(po.status);
        return <StatusBadge status={meta.status} label={meta.label} />;
      },
      cellClassName: (po) => {
        const meta = statusMeta(po.status);
        return meta.status === "neutral" ? undefined : statusCellClass(meta.status);
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold">Procurement</h1>
          <p className="text-sm text-muted-foreground">Approvals without the inbox archaeology.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/procurement/vendors" className={buttonVariants({ variant: "outline" })}>
            Vendors
          </Link>
          <Link href="/procurement/approvals" className={buttonVariants()}>
            Approvals
          </Link>
        </div>
      </div>

      {summary && (
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm">{summary}</p>
        </div>
      )}

      <StatRow>
        <StatTile label="Open spend" value={formatCompactCurrency(openSpend)} sublabel={`${openOrders.length} open orders`} />
        <StatTile
          label="Waiting on my approval"
          value={String((pendingApprovals ?? []).length)}
          accent={(pendingApprovals ?? []).length > 0 ? "warn" : "good"}
        />
        <StatTile label="Overdue deliveries" value={String(overdueCount)} accent={overdueCount > 0 ? "bad" : "good"} />
        <StatTile label="Total orders" value={String((orders ?? []).length)} />
      </StatRow>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={orders ?? []}
          rowKey={(po) => po.id}
          onRowClick={(po) => router.push(`/procurement/${po.id}`)}
          emptyTitle="No purchase orders yet"
          emptyDescription="Purchase requests, drafts and orders will show up here as they're created."
        />
      )}
    </div>
  );
}
