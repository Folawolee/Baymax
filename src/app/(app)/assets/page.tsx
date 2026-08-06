"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge, statusCellClass, type Status } from "@/components/data/StatusBadge";
import { FilterChips } from "@/components/data/FilterChips";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AssetRow {
  id: string;
  name: string;
  category: string;
  siteName: string;
  status: Status;
  statusLabel: string;
}

function statusMeta(status: string): { status: Status; label: string } {
  switch (status) {
    case "OPERATIONAL":
      return { status: "good", label: "Operational" };
    case "UNDER_MAINTENANCE":
      return { status: "warn", label: "Under maintenance" };
    case "OUT_OF_SERVICE":
      return { status: "bad", label: "Out of service" };
    default:
      return { status: "neutral", label: status };
  }
}

export default function AssetsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { data: assets, isLoading } = trpc.asset.list.useQuery();
  const { data: summary } = trpc.insights.moduleSummary.useQuery({ module: "assets" });

  const create = trpc.asset.create.useMutation({
    onSuccess: async () => {
      await utils.asset.list.invalidate();
      setName("");
      setCategory("");
      setAssetTag("");
    },
  });

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [assetTag, setAssetTag] = useState("");

  const rows: AssetRow[] = (assets ?? []).map((a) => {
    const meta = statusMeta(a.status);
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      siteName: a.site?.name ?? "Company-wide",
      status: meta.status,
      statusLabel: meta.label,
    };
  });

  const filtered = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;
  const operationalCount = rows.filter((r) => r.status === "good").length;
  const underMaintenanceCount = rows.filter((r) => r.status === "warn").length;
  const outOfServiceCount = rows.filter((r) => r.status === "bad").length;

  const categories = useMemo(
    () => [...new Set((assets ?? []).map((a) => a.category))].map((c) => ({ label: c, value: c })),
    [assets],
  );

  const columns: DataTableColumn<AssetRow>[] = [
    { key: "name", header: "Asset", cell: (r) => r.name },
    { key: "category", header: "Category", cell: (r) => r.category },
    { key: "site", header: "Site", cell: (r) => r.siteName },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} label={r.statusLabel} />,
      cellClassName: (r) => statusCellClass(r.status),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Assets</h1>
        <p className="text-sm text-muted-foreground">Company equipment and its maintenance history.</p>
      </div>

      {summary && (
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm">{summary}</p>
        </div>
      )}

      <StatRow>
        <StatTile label="Total assets" value={String(rows.length)} />
        <StatTile label="Operational" value={String(operationalCount)} accent="good" />
        <StatTile label="Under maintenance" value={String(underMaintenanceCount)} accent={underMaintenanceCount > 0 ? "warn" : "good"} />
        <StatTile label="Out of service" value={String(outOfServiceCount)} accent={outOfServiceCount > 0 ? "bad" : "good"} />
      </StatRow>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && category.trim()) {
            create.mutate({ name: name.trim(), category: category.trim(), assetTag: assetTag.trim() || undefined });
          }
        }}
      >
        <Input placeholder="Asset name" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
        <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-40" />
        <Input placeholder="Asset tag (optional)" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} className="w-40" />
        <Button type="submit" disabled={!name.trim() || !category.trim() || create.isPending}>
          Add asset
        </Button>
      </form>

      <FilterChips
        options={[
          { label: "Operational", value: "good" },
          { label: "Under maintenance", value: "warn" },
          { label: "Out of service", value: "bad" },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
        allLabel="All statuses"
      />

      {categories.length > 0 && (
        <p className="text-xs text-muted-foreground">Categories: {categories.map((c) => c.label).join(", ")}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/assets/${r.id}`)}
          emptyTitle="No assets yet"
          emptyDescription="Equipment your company owns and maintains will show up here."
        />
      )}
    </div>
  );
}
