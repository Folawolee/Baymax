"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { RecordDetailLayout } from "@/components/data/RecordDetailLayout";
import { ActivityLog, type ActivityEntry } from "@/components/data/ActivityLog";
import { StatusBadge } from "@/components/data/StatusBadge";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { QuantityInput } from "@/components/data/QuantityInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatQty } from "@/lib/format";

function batchStatusMeta(status: string): { label: string; kind: "good" | "warn" | "bad" | "neutral" } {
  switch (status) {
    case "WEIGHED_IN":
      return { label: "Weighed in", kind: "neutral" };
    case "WEIGHED_OUT":
      return { label: "Awaiting QC", kind: "warn" };
    case "QC_PASSED":
      return { label: "QC passed", kind: "good" };
    case "QC_FAILED":
      return { label: "QC failed", kind: "bad" };
    default:
      return { label: status, kind: "neutral" };
  }
}

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const { data: batch, isLoading } = trpc.productionBatch.getById.useQuery({ id });

  const [grossWeightKg, setGrossWeightKg] = useState("");
  const [qcResult, setQcResult] = useState<"PASS" | "FAIL">("PASS");
  const [qcNotes, setQcNotes] = useState("");

  const weighOut = trpc.productionBatch.recordWeighOut.useMutation();
  const recordQc = trpc.productionBatch.recordQualityTest.useMutation();

  async function invalidateAll() {
    await utils.productionBatch.getById.invalidate({ id });
    if (batch) {
      await utils.productionBatch.listBySite.invalidate({ siteId: batch.siteId });
      await utils.productionBatch.siteSummary.invalidate({ siteId: batch.siteId });
    }
    await utils.productionBatch.summaryForAllSites.invalidate();
  }

  async function handleWeighOut(e: React.FormEvent) {
    e.preventDefault();
    if (!grossWeightKg) return;
    await weighOut.mutateAsync({ batchId: id, grossWeightKg: Number(grossWeightKg) });
    await invalidateAll();
    setGrossWeightKg("");
  }

  async function handleQc(e: React.FormEvent) {
    e.preventDefault();
    await recordQc.mutateAsync({ batchId: id, result: qcResult, notes: qcNotes || undefined });
    await invalidateAll();
  }

  if (isLoading || !batch) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const meta = batchStatusMeta(batch.status);
  const netTons = batch.netWeightKg !== null ? batch.netWeightKg / 1000 : null;
  const previewNet = grossWeightKg && batch.tareWeightKg !== null ? Number(grossWeightKg) - batch.tareWeightKg : null;

  const entries: ActivityEntry[] = [];
  if (batch.tareWeighedAt) {
    entries.push({
      id: `${batch.id}:in`,
      actor: batch.loggedBy.name,
      action: `weighed in truck ${batch.truckPlateNumber} (tare ${formatQty((batch.tareWeightKg ?? 0) / 1000, "t")})`,
      timestamp: batch.tareWeighedAt,
    });
  }
  if (batch.grossWeighedAt) {
    entries.push({
      id: `${batch.id}:out`,
      actor: batch.loggedBy.name,
      action: `weighed out — gross ${formatQty((batch.grossWeightKg ?? 0) / 1000, "t")}, net ${formatQty((batch.netWeightKg ?? 0) / 1000, "t")}`,
      timestamp: batch.grossWeighedAt,
    });
  }
  if (batch.qualityTest) {
    entries.push({
      id: `${batch.id}:qc`,
      actor: batch.qualityTest.testedBy.name,
      action: `recorded quality test — ${batch.qualityTest.result === "PASS" ? "passed" : "failed"}${batch.qualityTest.notes ? ` — ${batch.qualityTest.notes}` : ""}`,
      timestamp: batch.qualityTest.createdAt,
    });
  }

  return (
    <RecordDetailLayout
      title={`Truck ${batch.truckPlateNumber}`}
      subtitle={batch.productLabel}
      badge={<StatusBadge status={meta.kind} label={meta.label} />}
      main={
        <div className="flex flex-col gap-4">
          <StatRow>
            <StatTile label="Tare weight" value={batch.tareWeightKg !== null ? formatQty(batch.tareWeightKg / 1000, "t") : "—"} />
            <StatTile label="Gross weight" value={batch.grossWeightKg !== null ? formatQty(batch.grossWeightKg / 1000, "t") : "—"} />
            <StatTile label="Net weight" value={netTons !== null ? formatQty(netTons, "t") : "—"} accent={netTons !== null ? "good" : undefined} />
          </StatRow>

          {batch.status === "WEIGHED_IN" && (
            <form onSubmit={handleWeighOut} className="flex flex-col gap-3 rounded-md border p-4">
              <p className="text-sm font-medium">Record weigh-out</p>
              <div className="space-y-1.5">
                <Label htmlFor="gross">Gross weight (kg)</Label>
                <QuantityInput id="gross" value={grossWeightKg} onChange={setGrossWeightKg} autoFocus placeholder="0" />
              </div>
              {previewNet !== null && (
                <p className="text-xs text-muted-foreground">Net weight will be {formatQty(previewNet / 1000, "t")}</p>
              )}
              <Button type="submit" disabled={!grossWeightKg || weighOut.isPending}>
                {weighOut.isPending ? "Saving…" : "Record weigh-out"}
              </Button>
            </form>
          )}

          {batch.status === "WEIGHED_OUT" && (
            <form onSubmit={handleQc} className="flex flex-col gap-3 rounded-md border p-4">
              <p className="text-sm font-medium">Record quality test</p>
              <div className="flex gap-2">
                <Button type="button" variant={qcResult === "PASS" ? "default" : "outline"} onClick={() => setQcResult("PASS")}>
                  Pass
                </Button>
                <Button type="button" variant={qcResult === "FAIL" ? "default" : "outline"} onClick={() => setQcResult("FAIL")}>
                  Fail
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qcNotes">Notes (optional)</Label>
                <Textarea id="qcNotes" value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} rows={2} />
              </div>
              <Button type="submit" disabled={recordQc.isPending}>
                {recordQc.isPending ? "Saving…" : "Record result"}
              </Button>
            </form>
          )}
        </div>
      }
      activity={<ActivityLog entries={entries} />}
    />
  );
}
