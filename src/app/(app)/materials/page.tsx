"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge, statusCellClass, type Status } from "@/components/data/StatusBadge";
import { FilterChips } from "@/components/data/FilterChips";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { BarChart } from "@/components/charts/BarChart";
import { formatQty } from "@/lib/format";
import { MaterialsSubNav } from "@/components/materials/MaterialsSubNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MaterialRow {
  id: string;
  name: string;
  unitOfMeasure: string;
  defaultReorderPoint: number;
  totalStock: number;
  status: Status;
}

export default function MaterialsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<string | null>(null);
  const { data: materials, isLoading: loadingMaterials } = trpc.material.list.useQuery();
  const { data: stockLevels, isLoading: loadingStock } = trpc.stock.listByCompany.useQuery();
  const { data: summary } = trpc.insights.moduleSummary.useQuery({ module: "materials" });

  const createMaterial = trpc.material.create.useMutation({
    onSuccess: async () => {
      await utils.material.list.invalidate();
      setNewName("");
      setNewUnit("");
      setNewReorder("");
    },
  });
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newReorder, setNewReorder] = useState("");

  const rows: MaterialRow[] = useMemo(() => {
    if (!materials) return [];
    return materials.map((m) => {
      const totalStock = (stockLevels ?? [])
        .filter((s) => s.materialId === m.id)
        .reduce((sum, s) => sum + s.quantity, 0);
      const status: Status =
        totalStock < m.defaultReorderPoint ? "bad" : totalStock < m.defaultReorderPoint * 1.5 ? "warn" : "good";
      return { id: m.id, name: m.name, unitOfMeasure: m.unitOfMeasure, defaultReorderPoint: m.defaultReorderPoint, totalStock, status };
    });
  }, [materials, stockLevels]);

  const filtered = filter === "low" ? rows.filter((r) => r.status !== "good") : rows;
  const belowCount = rows.filter((r) => r.status === "bad").length;
  const approachingCount = rows.filter((r) => r.status === "warn").length;
  const healthyCount = rows.filter((r) => r.status === "good").length;

  const columns: DataTableColumn<MaterialRow>[] = [
    { key: "name", header: "Material", cell: (r) => r.name },
    { key: "unit", header: "Unit", cell: (r) => r.unitOfMeasure },
    { key: "stock", header: "Total stock", cell: (r) => formatQty(r.totalStock), numeric: true },
    { key: "reorder", header: "Reorder point", cell: (r) => formatQty(r.defaultReorderPoint), numeric: true },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <StatusBadge status={r.status} label={r.status === "bad" ? "Below threshold" : r.status === "warn" ? "Approaching threshold" : "In stock"} />
      ),
      cellClassName: (r) => statusCellClass(r.status),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Materials</h1>
        <p className="text-sm text-muted-foreground">Know it&rsquo;s there before you need it.</p>
      </div>

      <MaterialsSubNav />

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim() && newUnit.trim()) {
            createMaterial.mutate({
              name: newName.trim(),
              unitOfMeasure: newUnit.trim(),
              defaultReorderPoint: newReorder ? Number(newReorder) : 0,
            });
          }
        }}
      >
        <Input placeholder="Material name" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-48" />
        <Input placeholder="Unit (e.g. tons, bags)" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="w-40" />
        <Input
          placeholder="Reorder point"
          type="number"
          min="0"
          value={newReorder}
          onChange={(e) => setNewReorder(e.target.value)}
          className="w-36"
        />
        <Button type="submit" disabled={!newName.trim() || !newUnit.trim() || createMaterial.isPending}>
          Add material
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">Reorder point — restock this material once quantity falls below this number.</p>

      {summary && (
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm">{summary}</p>
        </div>
      )}

      <StatRow>
        <StatTile label="Total materials" value={String(rows.length)} />
        <StatTile label="Below threshold" value={String(belowCount)} accent={belowCount > 0 ? "bad" : "good"} />
        <StatTile label="Approaching threshold" value={String(approachingCount)} accent={approachingCount > 0 ? "warn" : "good"} />
        <StatTile label="Healthy" value={String(healthyCount)} accent="good" />
      </StatRow>

      {rows.length > 0 && (
        <div className="rounded-md border p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Stock vs. reorder point</p>
          <BarChart
            items={rows.map((r) => ({
              id: r.id,
              label: r.name,
              value: r.totalStock,
              reference: r.defaultReorderPoint,
              status: r.status,
            }))}
            referenceLabel="Reorder point"
            formatValue={(n) => formatQty(n)}
          />
        </div>
      )}

      <FilterChips
        options={[{ label: "Below/approaching threshold", value: "low" }]}
        value={filter}
        onChange={setFilter}
        allLabel="All materials"
      />

      {loadingMaterials || loadingStock ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/materials/${r.id}`)}
          emptyTitle="No materials yet"
          emptyDescription="Materials your company orders and tracks will show up here."
        />
      )}
    </div>
  );
}
