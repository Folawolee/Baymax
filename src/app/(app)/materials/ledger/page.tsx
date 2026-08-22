"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { FilterChips } from "@/components/data/FilterChips";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { formatQty, formatCurrency, formatDate } from "@/lib/format";
import { MaterialsSubNav } from "@/components/materials/MaterialsSubNav";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type LedgerRow = {
  id: string;
  materialName: string;
  unitOfMeasure: string;
  date: Date | string;
  openingQty: number;
  receivedQty: number;
  transferredInQty: number;
  usedQty: number;
  wastedQty: number;
  transferredOutQty: number;
  closingQty: number;
  unitCost: number;
  usedCost: number;
};

export default function MaterialsLedgerPage() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [fromIso, setFromIso] = useState(() => isoDaysAgo(14));
  const [toIso, setToIso] = useState(() => todayIso());

  const { data: locations } = trpc.location.list.useQuery();

  useEffect(() => {
    if (!locationId && locations && locations.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocationId(locations[0].id);
    }
  }, [locationId, locations]);

  const { data: ledger, isLoading } = trpc.materialLedger.getByLocation.useQuery(
    { locationId: locationId ?? "", from: new Date(fromIso), to: new Date(toIso) },
    { enabled: !!locationId },
  );

  const rows: LedgerRow[] = (ledger ?? []).map((row) => ({
    id: row.id,
    materialName: row.material.name,
    unitOfMeasure: row.material.unitOfMeasure,
    date: row.date,
    openingQty: row.openingQty,
    receivedQty: row.receivedQty,
    transferredInQty: row.transferredInQty,
    usedQty: row.usedQty,
    wastedQty: row.wastedQty,
    transferredOutQty: row.transferredOutQty,
    closingQty: row.closingQty,
    unitCost: row.unitCost,
    usedCost: row.usedCost,
  }));

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          received: acc.received + r.receivedQty,
          used: acc.used + r.usedQty,
          wasted: acc.wasted + r.wastedQty,
          usedCost: acc.usedCost + r.usedCost,
        }),
        { received: 0, used: 0, wasted: 0, usedCost: 0 },
      ),
    [rows],
  );

  const columns: DataTableColumn<LedgerRow>[] = [
    { key: "material", header: "Material", cell: (r) => r.materialName },
    { key: "date", header: "Date", cell: (r) => formatDate(r.date) },
    { key: "opening", header: "Opening", cell: (r) => formatQty(r.openingQty, r.unitOfMeasure), numeric: true },
    { key: "received", header: "Received", cell: (r) => formatQty(r.receivedQty, r.unitOfMeasure), numeric: true },
    { key: "transferredIn", header: "Transferred in", cell: (r) => formatQty(r.transferredInQty, r.unitOfMeasure), numeric: true },
    { key: "used", header: "Used", cell: (r) => formatQty(r.usedQty, r.unitOfMeasure), numeric: true },
    { key: "wasted", header: "Wasted", cell: (r) => formatQty(r.wastedQty, r.unitOfMeasure), numeric: true },
    { key: "transferredOut", header: "Transferred out", cell: (r) => formatQty(r.transferredOutQty, r.unitOfMeasure), numeric: true },
    { key: "closing", header: "Closing", cell: (r) => formatQty(r.closingQty, r.unitOfMeasure), numeric: true },
    { key: "unitCost", header: "Unit cost", cell: (r) => formatCurrency(r.unitCost), numeric: true },
    { key: "usedCost", header: "Used cost", cell: (r) => formatCurrency(r.usedCost), numeric: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-lg font-semibold">Materials</h1>
        <p className="text-sm text-muted-foreground">Daily opening/closing ledger by location.</p>
      </div>

      <MaterialsSubNav />

      <FilterChips
        options={(locations ?? []).map((l) => ({ label: l.name, value: l.id }))}
        value={locationId}
        onChange={setLocationId}
        hideAll
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          From
          <input
            type="date"
            value={fromIso}
            onChange={(e) => setFromIso(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          To
          <input
            type="date"
            value={toIso}
            onChange={(e) => setToIso(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
      </div>

      <StatRow>
        <StatTile label="Total received" value={formatQty(totals.received)} />
        <StatTile label="Total used" value={formatQty(totals.used)} />
        <StatTile label="Total wasted" value={formatQty(totals.wasted)} accent={totals.wasted > 0 ? "warn" : "good"} />
        <StatTile label="Total used cost" value={formatCurrency(totals.usedCost)} />
      </StatRow>

      {!locationId ? (
        <p className="text-sm text-muted-foreground">Select a location to view its ledger.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          emptyTitle="No ledger entries for this range"
          emptyDescription="Deliveries, usage, transfers and waste for this location will show up here by day."
        />
      )}
    </div>
  );
}
