"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useOfflineQueue } from "@/lib/offlineQueue";
import { useCompanyConfig } from "@/lib/companyConfig";
import { QuantityInput } from "@/components/data/QuantityInput";
import { PhotoCaptureField } from "@/components/data/PhotoCaptureField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function SiteOperationsLogPage() {
  const router = useRouter();
  const { siteTermLabel } = useCompanyConfig();
  const { enqueue } = useOfflineQueue();
  const utils = trpc.useUtils();

  const { data: me } = trpc.user.me.useQuery();
  const { data: sites } = trpc.site.list.useQuery({ activeOnly: true });
  const { data: materials } = trpc.material.list.useQuery();
  const { data: locations } = trpc.location.list.useQuery();
  const logMutation = trpc.usageLog.create.useMutation();

  const [siteId, setSiteId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [qty, setQty] = useState("");
  const [task, setTask] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState<null | "saved" | "queued">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (siteId || !sites || sites.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSiteId(me?.siteId ?? sites[0].id);
  }, [me, sites, siteId]);

  const siteLocations = useMemo(
    () => (locations ?? []).filter((l) => l.siteId === siteId || l.siteId === null),
    [locations, siteId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!siteId || !materialId || !locationId || !qty || !task) return;

    const wasOnline = navigator.onLine;
    try {
      await enqueue(`Usage log — ${task}`, async () => {
        await logMutation.mutateAsync({ materialId, siteId, locationId, qty: Number(qty), task });
        await utils.siteOperations.listRecentActivity.invalidate();
        await utils.siteOperations.todaySummary.invalidate();
        await utils.stock.listByCompany.invalidate();
        await utils.stock.listLow.invalidate();
      });
      setStatus(wasOnline ? "saved" : "queued");
      setMaterialId("");
      setQty("");
      setTask("");
      setPhoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log usage");
    }
  }

  if (status) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
        <p className="font-heading text-lg font-semibold">
          {status === "saved" ? "Logged" : "Saved — will sync when back online"}
        </p>
        <Button onClick={() => router.push("/site-operations")}>Back to Site Operations</Button>
        <Button variant="outline" onClick={() => setStatus(null)}>
          Log another entry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-5">
      <div>
        <h1 className="font-heading text-lg font-semibold">Log site usage</h1>
        <p className="text-sm text-muted-foreground">Record what materials went where today, and for what.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site">{siteTermLabel}</Label>
        <select
          id="site"
          value={siteId}
          onChange={(e) => {
            setSiteId(e.target.value);
            setLocationId("");
          }}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          {(sites ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

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
        <Label htmlFor="location">Location</Label>
        <select
          id="location"
          required
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          <option value="" disabled>
            Select a location
          </option>
          {siteLocations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qty">Quantity</Label>
        <QuantityInput id="qty" value={qty} onChange={setQty} autoFocus placeholder="0" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task">Task / portion</Label>
        <Input
          id="task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g. Section 3 paving — cement pour"
        />
      </div>

      <PhotoCaptureField value={photo} onChange={setPhoto} />

      {error && <p className="text-sm text-status-bad">{error}</p>}

      <Button type="submit" size="lg" disabled={!siteId || !materialId || !locationId || !qty || !task || logMutation.isPending}>
        {logMutation.isPending ? "Saving…" : "Save entry"}
      </Button>
    </form>
  );
}
