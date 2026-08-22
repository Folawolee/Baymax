"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { QuantityInput } from "@/components/data/QuantityInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function NewBatchPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: sites } = trpc.productionFacility.list.useQuery({ activeOnly: true });
  const weighIn = trpc.productionBatch.weighIn.useMutation();

  const batchFacilities = (sites ?? []).filter((s) => s.productionMode === "BATCH_WEIGHBRIDGE");

  const [facilityId, setFacilityId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [productLabel, setProductLabel] = useState("");
  const [truckPlateNumber, setTruckPlateNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [tareWeightKg, setTareWeightKg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: openOrders } = trpc.productionOrder.listByFacility.useQuery({ facilityId }, { enabled: !!facilityId });
  const availableOrders = (openOrders ?? []).filter((o) => o.progress.status === "OPEN" || o.progress.status === "IN_PROGRESS");

  useEffect(() => {
    if (facilityId || batchFacilities.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFacilityId(batchFacilities[0].id);
  }, [batchFacilities, facilityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!facilityId || !productLabel || !truckPlateNumber || !tareWeightKg) return;
    try {
      const batch = await weighIn.mutateAsync({
        facilityId,
        orderId: orderId || undefined,
        productLabel,
        truckPlateNumber,
        driverName: driverName || undefined,
        tareWeightKg: Number(tareWeightKg),
      });
      await utils.productionBatch.listByFacility.invalidate({ facilityId });
      await utils.productionBatch.facilitySummary.invalidate({ facilityId });
      await utils.productionBatch.summaryForAllFacilities.invalidate();
      if (orderId) {
        await utils.productionOrder.listByFacility.invalidate({ facilityId });
        await utils.productionOrder.getById.invalidate({ id: orderId });
      }
      router.push(`/production/batch/${batch.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to weigh in truck");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-5">
      <div>
        <h1 className="font-heading text-lg font-semibold">Weigh in truck</h1>
        <p className="text-sm text-muted-foreground">Record the empty truck weight before loading.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site">Line</Label>
        <select
          id="site"
          value={facilityId}
          onChange={(e) => {
            setFacilityId(e.target.value);
            setOrderId("");
          }}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          {batchFacilities.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="order">Which order is this for? (optional)</Label>
        <select
          id="order"
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            const chosen = availableOrders.find((o) => o.order.id === e.target.value);
            if (chosen) setProductLabel(chosen.order.productLabel);
          }}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          <option value="">No order — general production</option>
          {availableOrders.map(({ order }) => (
            <option key={order.id} value={order.id}>
              {order.customer?.name ?? "No customer"} — {order.productLabel}
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
        <Label htmlFor="plate">Truck plate number</Label>
        <Input id="plate" value={truckPlateNumber} onChange={(e) => setTruckPlateNumber(e.target.value)} placeholder="e.g. LSD-442-XY" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="driver">Driver (optional)</Label>
        <Input id="driver" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tare">Tare weight (kg)</Label>
        <QuantityInput id="tare" value={tareWeightKg} onChange={setTareWeightKg} autoFocus placeholder="0" />
      </div>

      {error && <p className="text-sm text-status-bad">{error}</p>}

      <Button type="submit" size="lg" disabled={!facilityId || !productLabel || !truckPlateNumber || !tareWeightKg || weighIn.isPending}>
        {weighIn.isPending ? "Saving…" : "Weigh in"}
      </Button>
    </form>
  );
}
