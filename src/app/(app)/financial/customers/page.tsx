"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CustomersPage() {
  const utils = trpc.useUtils();
  const { data: customers, isLoading } = trpc.customer.list.useQuery();
  const create = trpc.customer.create.useMutation({
    onSuccess: async () => {
      await utils.customer.list.invalidate();
      setName("");
      setContact("");
    },
  });

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const columns: DataTableColumn<NonNullable<typeof customers>[number]>[] = [
    { key: "name", header: "Customer", cell: (c) => c.name },
    { key: "contact", header: "Contact", cell: (c) => c.contact ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">Who you invoice for completed work.</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate({ name: name.trim(), contact: contact.trim() || undefined });
        }}
      >
        <Input placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
        <Input placeholder="Contact (optional)" value={contact} onChange={(e) => setContact(e.target.value)} className="w-48" />
        <Button type="submit" disabled={!name.trim() || create.isPending}>
          Add customer
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={customers ?? []} rowKey={(c) => c.id} emptyTitle="No customers yet" />
      )}
    </div>
  );
}
