"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
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
  const searchParams = useSearchParams();
  const { siteTermLabel } = useCompanyConfig();
  const { enqueue } = useOfflineQueue();
  const utils = trpc.useUtils();

  const { data: me } = trpc.user.me.useQuery();
  const { data: sites } = trpc.road.list.useQuery({ activeOnly: true });
  const { data: materials } = trpc.material.list.useQuery();
  const { data: locations } = trpc.location.list.useQuery();
  const logMutation = trpc.usageLog.create.useMutation();
  const createLocation = trpc.location.createForSite.useMutation();

  const [roadId, setRoadId] = useState(() => searchParams.get("roadId") ?? "");
  const [materialId, setMaterialId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [qty, setQty] = useState("");
  const [task, setTask] = useState("");
  const [workItemId, setWorkItemId] = useState("");
  const [isWaste, setIsWaste] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState<null | "saved" | "queued">(null);
  const [error, setError] = useState<string | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");

  useEffect(() => {
    if (roadId || !sites || sites.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoadId(me?.roadId ?? sites[0].id);
  }, [me, sites, roadId]);

  const siteLocations = useMemo(
    () => (locations ?? []).filter((l) => l.roadId === roadId),
    [locations, roadId],
  );

  const { data: workItems } = trpc.workItem.listByScope.useQuery({ roadId }, { enabled: !!roadId });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!roadId || !materialId || !locationId || !qty || !task) return;

    const wasOnline = navigator.onLine;
    try {
      await enqueue(`Usage log — ${task}`, async () => {
        await logMutation.mutateAsync({
          materialId,
          roadId,
          locationId,
          qty: Number(qty),
          task,
          workItemId: workItemId || undefined,
          isWaste,
        });
        await utils.siteOperations.listRecentActivity.invalidate();
        await utils.siteOperations.todaySummary.invalidate();
        await utils.stock.listByCompany.invalidate();
        await utils.stock.listLow.invalidate();
      });
      setStatus(wasOnline ? "saved" : "queued");
      setMaterialId("");
      setQty("");
      setTask("");
      setWorkItemId("");
      setIsWaste(false);
      setPhoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log usage");
    }
  }

  async function addLocation() {
    if (!roadId || !newLocationName.trim()) return;
    const location = await createLocation.mutateAsync({ name: newLocationName.trim(), typeLabel: "work_area", roadId });
    await utils.location.list.invalidate();
    setLocationId(location.id);
    setNewLocationName("");
    setShowLocationForm(false);
  }

  if (status) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
        <p className="font-heading text-lg font-semibold">
          {status === "saved" ? "Logged" : "Saved — will sync when back online"}
        </p>
        <Button onClick={() => router.push("/site-operations")}>Back to Project Operations</Button>
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
          value={roadId}
          onChange={(e) => {
            setRoadId(e.target.value);
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
        <div className="flex items-center justify-between gap-3"><Label htmlFor="location">Location for this {siteTermLabel.toLowerCase()}</Label><button type="button" onClick={() => setShowLocationForm((value) => !value)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus className="size-3.5" /> Add location</button></div>
        <select id="location" required value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" disabled={!roadId}>
          <option value="" disabled>{roadId ? "Select a location" : `Select a ${siteTermLabel.toLowerCase()} first`}</option>
          {siteLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {showLocationForm && <div className="flex gap-2 rounded-lg border bg-muted/30 p-3"><Input value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} placeholder="e.g. Section 3 paving" /><Button type="button" size="sm" onClick={() => void addLocation()} disabled={!roadId || !newLocationName.trim() || createLocation.isPending}>{createLocation.isPending ? "Adding…" : "Add"}</Button></div>}
        {roadId && siteLocations.length === 0 && <p className="text-xs text-muted-foreground">No locations have been added for this {siteTermLabel.toLowerCase()} yet. Add the work area above before logging usage.</p>}
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

      <div className="space-y-1.5">
        <Label htmlFor="workItem">Work item (optional)</Label>
        <select
          id="workItem"
          value={workItemId}
          onChange={(e) => setWorkItemId(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          disabled={!roadId}
        >
          <option value="">— none —</option>
          {(workItems ?? []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isWaste}
          onChange={(e) => setIsWaste(e.target.checked)}
          className="size-4 rounded border-input"
        />
        This is waste
      </label>

      <PhotoCaptureField value={photo} onChange={setPhoto} />

      {error && <p className="text-sm text-status-bad">{error}</p>}

      <Button type="submit" size="lg" disabled={!roadId || !materialId || !locationId || !qty || !task || logMutation.isPending}>
        {logMutation.isPending ? "Saving…" : "Save entry"}
      </Button>
    </form>
  );
}
