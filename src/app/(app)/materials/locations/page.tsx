"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaterialsSubNav } from "@/components/materials/MaterialsSubNav";

interface LocationRow {
  id: string;
  name: string;
  typeLabel: string;
  siteName: string;
}

export default function LocationsPage() {
  const utils = trpc.useUtils();
  const { data: locations, isLoading } = trpc.location.list.useQuery();
  const { data: sites } = trpc.site.list.useQuery();

  const create = trpc.location.create.useMutation({
    onSuccess: async () => {
      await utils.location.list.invalidate();
      setName("");
      setTypeLabel("");
      setSiteId("");
    },
  });

  const [name, setName] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [siteId, setSiteId] = useState("");

  const rows: LocationRow[] = (locations ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    typeLabel: l.typeLabel,
    siteName: l.site?.name ?? "Company-wide",
  }));

  const columns: DataTableColumn<LocationRow>[] = [
    { key: "name", header: "Location", cell: (r) => r.name },
    { key: "type", header: "Type", cell: (r) => r.typeLabel },
    { key: "site", header: "Site", cell: (r) => r.siteName },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Materials</h1>
        <p className="text-sm text-muted-foreground">Warehouses, yards and stores materials are held at.</p>
      </div>

      <MaterialsSubNav />

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && typeLabel.trim()) {
            create.mutate({ name: name.trim(), typeLabel: typeLabel.trim(), siteId: siteId || undefined });
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="locName">Name</Label>
          <Input id="locName" placeholder="e.g. Central Warehouse" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="locType">Type</Label>
          <Input id="locType" placeholder="e.g. warehouse, yard, site_store" value={typeLabel} onChange={(e) => setTypeLabel(e.target.value)} className="w-48" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="locSite">Site (optional)</Label>
          <select
            id="locSite"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Company-wide</option>
            {(sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={!name.trim() || !typeLabel.trim() || create.isPending}>
          Add location
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No locations yet" />
      )}
    </div>
  );
}
