"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductionModePicker, type ProductionMode } from "@/components/production/ProductionModePicker";
import { useCompanyConfig } from "@/lib/companyConfig";
import { useAuth } from "@/lib/auth";

interface SiteRow {
  id: string;
  name: string;
  typeLabel: string;
  productionMode: string;
  projectName: string | null;
  status: string;
}

export default function ManageSitesPage() {
  const { user } = useAuth();
  const { siteTermLabel } = useCompanyConfig();
  const utils = trpc.useUtils();
  const { data: sites, isLoading } = trpc.site.list.useQuery();
  const { data: projects } = trpc.project.list.useQuery();
  const create = trpc.site.create.useMutation({
    onSuccess: async () => {
      await utils.site.list.invalidate();
      setName("");
      setTypeLabel("");
      setProductionMode("SIMPLE");
      setProjectId("");
    },
  });
  const complete = trpc.site.complete.useMutation({ onSuccess: () => utils.site.list.invalidate() });
  const reopen = trpc.site.reopen.useMutation({ onSuccess: () => utils.site.list.invalidate() });

  const [name, setName] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [productionMode, setProductionMode] = useState<ProductionMode>("SIMPLE");
  const [projectId, setProjectId] = useState("");

  const rows: SiteRow[] = (sites ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    typeLabel: s.typeLabel,
    productionMode: s.productionMode,
    projectName: s.project?.name ?? null,
    status: s.status,
  }));

  const columns: DataTableColumn<SiteRow>[] = [
    { key: "name", header: siteTermLabel, cell: (r) => r.name },
    { key: "type", header: "Type", cell: (r) => r.typeLabel },
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
    { key: "project", header: "Project", cell: (r) => r.projectName ?? "—" },
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
            cell: (r: SiteRow) => (
              <Button
                variant="outline"
                size="sm"
                disabled={complete.isPending || reopen.isPending}
                onClick={() => (r.status === "COMPLETED" ? reopen.mutate({ id: r.id }) : complete.mutate({ id: r.id }))}
              >
                {r.status === "COMPLETED" ? "Reopen" : "Mark complete"}
              </Button>
            ),
          } satisfies DataTableColumn<SiteRow>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Manage {siteTermLabel.toLowerCase()}s</h1>
        <p className="text-sm text-muted-foreground">
          Add a new {siteTermLabel.toLowerCase()} and choose how its production gets tracked.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-md border p-4 sm:max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && typeLabel.trim()) {
            create.mutate({
              name: name.trim(),
              typeLabel: typeLabel.trim(),
              productionMode,
              projectId: projectId || undefined,
            });
          }
        }}
      >
        <p className="text-sm font-medium">Add a {siteTermLabel.toLowerCase()}</p>
        <div className="space-y-1.5">
          <Label htmlFor="siteName">Name</Label>
          <Input id="siteName" value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. ${siteTermLabel} 7`} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="siteType">Type</Label>
          <Input
            id="siteType"
            value={typeLabel}
            onChange={(e) => setTypeLabel(e.target.value)}
            placeholder="e.g. construction_site, production_line, warehouse"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Production tracking</Label>
          <ProductionModePicker value={productionMode} onChange={setProductionMode} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="siteProject">Project (optional)</Label>
          <select
            id="siteProject"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Ungrouped</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={!name.trim() || !typeLabel.trim() || create.isPending}>
          {create.isPending ? "Adding…" : `Add ${siteTermLabel.toLowerCase()}`}
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle={`No ${siteTermLabel.toLowerCase()}s yet`} />
      )}
    </div>
  );
}
