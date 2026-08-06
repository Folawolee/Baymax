"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { QuantityInput } from "@/components/data/QuantityInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MaterialsSubNav } from "@/components/materials/MaterialsSubNav";

export default function TransferPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: materials } = trpc.material.list.useQuery();
  const { data: locations } = trpc.location.list.useQuery();
  const transfer = trpc.transfer.create.useMutation();

  const [materialId, setMaterialId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fromLocationId === toLocationId) {
      setError("Pick two different locations.");
      return;
    }
    try {
      await transfer.mutateAsync({ materialId, fromLocationId, toLocationId, qty: Number(qty) });
      await utils.stock.listByCompany.invalidate();
      await utils.stock.listLow.invalidate();
      router.push("/materials/by-location");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <MaterialsSubNav />

      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-sm flex-col gap-5">
        <h1 className="font-heading text-lg font-semibold">Transfer stock</h1>

        <div className="space-y-1.5">
          <Label htmlFor="material">Material</Label>
          <select
            id="material"
            required
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            <option value="" disabled>
              Select a material
            </option>
            {(materials ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <select
            id="from"
            required
            value={fromLocationId}
            onChange={(e) => setFromLocationId(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            <option value="" disabled>
              Select a location
            </option>
            {(locations ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <select
            id="to"
            required
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            <option value="" disabled>
              Select a location
            </option>
            {(locations ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="qty">Quantity</Label>
          <QuantityInput id="qty" value={qty} onChange={setQty} placeholder="0" />
        </div>

        {error && <p className="text-sm text-status-bad">{error}</p>}

        <Button type="submit" size="lg" disabled={!materialId || !fromLocationId || !toLocationId || !qty || transfer.isPending}>
          {transfer.isPending ? "Transferring…" : "Transfer"}
        </Button>
      </form>
    </div>
  );
}
