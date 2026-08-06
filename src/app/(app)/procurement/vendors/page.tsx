"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VendorsPage() {
  const utils = trpc.useUtils();
  const { data: vendors, isLoading } = trpc.vendor.list.useQuery();
  const create = trpc.vendor.create.useMutation({
    onSuccess: async () => {
      await utils.vendor.list.invalidate();
      setName("");
      setContact("");
    },
  });

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const columns: DataTableColumn<NonNullable<typeof vendors>[number]>[] = [
    { key: "name", header: "Vendor", cell: (v) => v.name },
    { key: "contact", header: "Contact", cell: (v) => v.contact ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Vendors</h1>
        <p className="text-sm text-muted-foreground">Vendor records with price history per material.</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate({ name: name.trim(), contact: contact.trim() || undefined });
        }}
      >
        <Input placeholder="Vendor name" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
        <Input placeholder="Contact (optional)" value={contact} onChange={(e) => setContact(e.target.value)} className="w-48" />
        <Button type="submit" disabled={!name.trim() || create.isPending}>
          Add vendor
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={vendors ?? []} rowKey={(v) => v.id} emptyTitle="No vendors yet" />
      )}
    </div>
  );
}
