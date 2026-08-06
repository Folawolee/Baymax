"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge, statusCellClass, type Status } from "@/components/data/StatusBadge";
import { FilterChips } from "@/components/data/FilterChips";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { formatQty } from "@/lib/format";
import { MaterialsSubNav } from "@/components/materials/MaterialsSubNav";

interface StockRow {
  materialId: string;
  locationId: string;
  materialName: string;
  locationName: string;
  unitOfMeasure: string;
  quantity: number;
  status: Status;
}

export default function MaterialsByLocationPage() {
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const { data: stockLevels, isLoading } = trpc.stock.listByCompany.useQuery();
  const { data: lowStock } = trpc.stock.listLow.useQuery();
  const { data: locations } = trpc.location.list.useQuery();

  const lowKeys = useMemo(
    () => new Set((lowStock ?? []).map((l) => `${l.materialId}:${l.locationId}`)),
    [lowStock],
  );

  const rows: StockRow[] = (stockLevels ?? []).map((s) => ({
    materialId: s.materialId,
    locationId: s.locationId,
    materialName: s.material.name,
    locationName: s.location.name,
    unitOfMeasure: s.material.unitOfMeasure,
    quantity: s.quantity,
    status: lowKeys.has(`${s.materialId}:${s.locationId}`) ? "bad" : "good",
  }));

  const filtered = locationFilter ? rows.filter((r) => r.locationId === locationFilter) : rows;
  const belowCount = rows.filter((r) => r.status === "bad").length;

  const columns: DataTableColumn<StockRow>[] = [
    { key: "material", header: "Material", cell: (r) => r.materialName },
    { key: "location", header: "Location", cell: (r) => r.locationName },
    { key: "qty", header: "Quantity", cell: (r) => formatQty(r.quantity, r.unitOfMeasure), numeric: true },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} label={r.status === "bad" ? "Below threshold" : "In stock"} />,
      cellClassName: (r) => statusCellClass(r.status),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-lg font-semibold">Materials</h1>
        <p className="text-sm text-muted-foreground">Stop guessing what&rsquo;s in stock.</p>
      </div>

      <MaterialsSubNav />

      <StatRow>
        <StatTile label="Stock records" value={String(rows.length)} />
        <StatTile label="Below threshold" value={String(belowCount)} accent={belowCount > 0 ? "bad" : "good"} />
        <StatTile label="Locations" value={String((locations ?? []).length)} />
      </StatRow>

      <FilterChips
        options={(locations ?? []).map((l) => ({ label: l.name, value: l.id }))}
        value={locationFilter}
        onChange={setLocationFilter}
        allLabel="All locations"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => `${r.materialId}:${r.locationId}`}
          emptyTitle="No stock recorded yet"
          emptyDescription="Stock levels update automatically as deliveries, usage and transfers are logged."
        />
      )}
    </div>
  );
}
