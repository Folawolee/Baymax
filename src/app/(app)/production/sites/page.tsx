"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductionModePicker, type ProductionMode } from "@/components/production/ProductionModePicker";
import { useAuth } from "@/lib/auth";

interface FacilityRow {
  id: string;
  name: string;
  facilityType: string;
  productionMode: string;
  status: string;
}

export default function ManageFacilitiesPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: facilities, isLoading } = trpc.productionFacility.list.useQuery();
  const create = trpc.productionFacility.create.useMutation({
    onSuccess: async () => {
      await utils.productionFacility.list.invalidate();
      setName("");
      setFacilityType("");
      setProductionMode("SIMPLE");
    },
  });
  const complete = trpc.productionFacility.complete.useMutation({ onSuccess: () => utils.productionFacility.list.invalidate() });
  const reopen = trpc.productionFacility.reopen.useMutation({ onSuccess: () => utils.productionFacility.list.invalidate() });

  const [name, setName] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [productionMode, setProductionMode] = useState<ProductionMode>("SIMPLE");

  const rows: FacilityRow[] = (facilities ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    facilityType: f.facilityType,
    productionMode: f.productionMode,
    status: f.status,
  }));

  const columns: DataTableColumn<FacilityRow>[] = [
    { key: "name", header: "Facility", cell: (r) => r.name },
    { key: "type", header: "Type", cell: (r) => r.facilityType },
    {
      key: "mode",
      header: "Production tracking",
      cell: (r) => (
        <StatusBadge
          status="neutral"
          label={r.productionMode === "BATCH_WEIGHBRIDGE" ? "Weighbridge batch" : "Simple output"}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <StatusBadge status={r.status === "COMPLETED" ? "good" : "neutral"} label={r.status === "COMPLETED" ? "Completed" : "Active"} />
      ),
    },
    ...(user?.role === "OWNER_ADMIN"
      ? [
          {
            key: "actions",
            header: "",
            cell: (r: FacilityRow) => (
              <Button
                variant="outline"
                size="sm"
                disabled={complete.isPending || reopen.isPending}
                onClick={() => (r.status === "COMPLETED" ? reopen.mutate({ id: r.id }) : complete.mutate({ id: r.id }))}
              >
                {r.status === "COMPLETED" ? "Reopen" : "Mark complete"}
              </Button>
            ),
          } satisfies DataTableColumn<FacilityRow>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Manage production facilities</h1>
        <p className="text-sm text-muted-foreground">
          Plants and production lines, and how each one&apos;s output gets tracked. Roads are managed within their project.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-md border p-4 sm:max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && facilityType.trim()) {
            create.mutate({ name: name.trim(), facilityType: facilityType.trim(), productionMode });
          }
        }}
      >
        <p className="text-sm font-medium">Add a facility</p>
        <div className="space-y-1.5">
          <Label htmlFor="facilityName">Name</Label>
          <Input id="facilityName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asphalt Plant" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="facilityType">Type</Label>
          <Input
            id="facilityType"
            value={facilityType}
            onChange={(e) => setFacilityType(e.target.value)}
            placeholder="e.g. asphalt_plant, batching_plant, production_line"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Production tracking</Label>
          <ProductionModePicker value={productionMode} onChange={setProductionMode} />
        </div>
        <Button type="submit" disabled={!name.trim() || !facilityType.trim() || create.isPending}>
          {create.isPending ? "Adding…" : "Add facility"}
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No production facilities yet" />
      )}
    </div>
  );
}
