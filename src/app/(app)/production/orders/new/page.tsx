"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { QuantityInput } from "@/components/data/QuantityInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewProductionOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const { data: sites } = trpc.site.list.useQuery({ activeOnly: true });
  const { data: customers } = trpc.customer.list.useQuery();
  const create = trpc.productionOrder.create.useMutation();

  const batchSites = (sites ?? []).filter((s) => s.productionMode === "BATCH_WEIGHBRIDGE");

  const [siteId, setSiteId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [productLabel, setProductLabel] = useState("");
  const [targetTons, setTargetTons] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (siteId || batchSites.length === 0) return;
    const preselect = searchParams.get("siteId");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSiteId(preselect && batchSites.some((s) => s.id === preselect) ? preselect : batchSites[0].id);
  }, [batchSites, siteId, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!siteId || !productLabel || !targetTons) return;
    try {
      const order = await create.mutateAsync({
        siteId,
        customerId: customerId || undefined,
        productLabel,
        targetQuantityKg: Number(targetTons) * 1000,
        notes: notes || undefined,
      });
      await utils.productionOrder.listBySite.invalidate({ siteId });
      await utils.productionOrder.listByCompany.invalidate();
      router.push(`/production/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-5">
      <div>
        <h1 className="font-heading text-lg font-semibold">New order</h1>
        <p className="text-sm text-muted-foreground">Log what a client asked for — trucks weighed against this will count toward it.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site">Line</Label>
        <select
          id="site"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          {batchSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customer">Customer (optional)</Label>
        <select
          id="customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          <option value="">No customer on file</option>
          {(customers ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product">Product</Label>
        <Input
          id="product"
          value={productLabel}
          onChange={(e) => setProductLabel(e.target.value)}
          placeholder="e.g. Asphalt — Binder Course"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="target">How much did they order? (tons)</Label>
        <QuantityInput id="target" value={targetTons} onChange={setTargetTons} autoFocus placeholder="0" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-status-bad">{error}</p>}

      <Button type="submit" size="lg" disabled={!siteId || !productLabel || !targetTons || create.isPending}>
        {create.isPending ? "Saving…" : "Log order"}
      </Button>
    </form>
  );
}
