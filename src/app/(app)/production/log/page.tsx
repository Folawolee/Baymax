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
import { Textarea } from "@/components/ui/textarea";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ProductionLogPage() {
  const router = useRouter();
  const { productionUnitLabel } = useCompanyConfig();
  const { enqueue } = useOfflineQueue();
  const utils = trpc.useUtils();

  const { data: me } = trpc.user.me.useQuery();
  const { data: sites } = trpc.productionFacility.list.useQuery({ activeOnly: true });
  const logMutation = trpc.production.log.useMutation();

  const [facilityId, setFacilityId] = useState<string>("");
  const [date, setDate] = useState(todayIso());
  const [output, setOutput] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState<null | "saved" | "queued">(null);

  useEffect(() => {
    if (facilityId || !sites || sites.length === 0) return;
    // Defaulting to the user's own site once the async queries resolve —
    // genuinely syncing local state from data that arrives after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFacilityId(me?.facilityId ?? sites[0].id);
  }, [me, sites, facilityId]);

  const { data: lastLog } = trpc.production.lastLog.useQuery({ facilityId }, { enabled: !!facilityId });

  const lastLogHint = useMemo(() => {
    if (!lastLog) return null;
    return `Yesterday: ${lastLog.output} ${productionUnitLabel}`;
  }, [lastLog, productionUnitLabel]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!facilityId || !output) return;

    const wasOnline = navigator.onLine;
    await enqueue(`Production log for ${date}`, async () => {
      await logMutation.mutateAsync({ facilityId, date: new Date(date), output: Number(output), notes: notes || undefined });
      await utils.production.statusForAllFacilities.invalidate();
      await utils.production.planVsActual.invalidate({ facilityId });
    });

    setStatus(wasOnline ? "saved" : "queued");
    setOutput("");
    setNotes("");
    setPhoto(null);
  }

  if (status) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
        <p className="font-heading text-lg font-semibold">
          {status === "saved" ? "Logged" : "Saved — will sync when back online"}
        </p>
        <Button onClick={() => router.push("/production")}>Back to Production</Button>
        <Button variant="outline" onClick={() => setStatus(null)}>
          Log another entry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-5">
      <div>
        <h1 className="font-heading text-lg font-semibold">Log {productionUnitLabel}</h1>
        {lastLogHint && <p className="text-sm text-muted-foreground">{lastLogHint}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site">Facility</Label>
        <select
          id="site"
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
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
        <Label htmlFor="date">Date</Label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="output">Output ({productionUnitLabel})</Label>
        <QuantityInput id="output" value={output} onChange={setOutput} autoFocus placeholder="0" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <PhotoCaptureField value={photo} onChange={setPhoto} />

      <Button type="submit" size="lg" disabled={!facilityId || !output || logMutation.isPending}>
        {logMutation.isPending ? "Saving…" : "Save entry"}
      </Button>
    </form>
  );
}
