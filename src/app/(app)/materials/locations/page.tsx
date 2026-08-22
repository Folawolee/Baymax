"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useScopeOptions, scopeArgs } from "@/lib/scopes";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationRow {
  id: string;
  name: string;
  typeLabel: string;
  siteName: string;
}

export default function LocationsPage() {
  const utils = trpc.useUtils();
  const { data: locations, isLoading } = trpc.location.list.useQuery();
  const scopes = useScopeOptions();

  const create = trpc.location.create.useMutation({
    onSuccess: async () => {
      await utils.location.list.invalidate();
      setName("");
      setTypeLabel("");
      setScopeKey("");
    },
  });

  const [name, setName] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [scopeKey, setScopeKey] = useState("");

  const rows: LocationRow[] = (locations ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    typeLabel: l.typeLabel,
    siteName: l.road?.name ?? l.facility?.name ?? "Company-wide",
  }));

  const columns: DataTableColumn<LocationRow>[] = [
    { key: "name", header: "Location", cell: (r) => r.name },
    { key: "type", header: "Type", cell: (r) => r.typeLabel },
    { key: "site", header: "Site", cell: (r) => r.siteName },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Project locations</h1>
        <p className="text-sm text-muted-foreground">Work areas belong to a specific site and are used when recording material usage.</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && typeLabel.trim()) {
            create.mutate({ name: name.trim(), typeLabel: typeLabel.trim(), ...scopeArgs(scopeKey) });
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
          <Label htmlFor="locSite">Site</Label>
          <select
            id="locSite"
            value={scopeKey}
            onChange={(e) => setScopeKey(e.target.value)}
            className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a site</option>
            {scopes.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={!name.trim() || !typeLabel.trim() || !scopeKey || create.isPending}>
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
