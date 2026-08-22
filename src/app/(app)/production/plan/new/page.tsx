"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyConfig } from "@/lib/companyConfig";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewProductionPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const { productionUnitLabel } = useCompanyConfig();
  const { data: sites } = trpc.productionFacility.list.useQuery({ activeOnly: true });
  const createPlan = trpc.production.createPlan.useMutation();

  const simpleSites = (sites ?? []).filter((s) => s.productionMode === "SIMPLE");

  const [facilityId, setFacilityId] = useState("");
  const [targetOutput, setTargetOutput] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [milestoneNote, setMilestoneNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (facilityId || simpleSites.length === 0) return;
    const preselect = searchParams.get("facilityId");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFacilityId(preselect && simpleSites.some((s) => s.id === preselect) ? preselect : simpleSites[0].id);
  }, [simpleSites, facilityId, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!facilityId || !targetOutput || !endDate) return;
    try {
      await createPlan.mutateAsync({
        facilityId,
        targetOutput: Number(targetOutput),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        milestoneNote: milestoneNote || undefined,
      });
      await utils.production.planVsActual.invalidate({ facilityId });
      await utils.production.statusForAllFacilities.invalidate();
      router.push(`/production/${facilityId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-5">
      <div>
        <h1 className="font-heading text-lg font-semibold">Set a production target</h1>
        <p className="text-sm text-muted-foreground">How much {productionUnitLabel} a facility should produce over a date range.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site">Facility</Label>
        <select
          id="site"
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          {simpleSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="target">Target {productionUnitLabel}</Label>
        <Input id="target" type="number" min="0" value={targetOutput} onChange={(e) => setTargetOutput(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start">Start date</Label>
          <input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end">End date</Label>
          <input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Milestone note (optional)</Label>
        <Textarea id="note" value={milestoneNote} onChange={(e) => setMilestoneNote(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-status-bad">{error}</p>}

      <Button type="submit" size="lg" disabled={!facilityId || !targetOutput || !endDate || createPlan.isPending}>
        {createPlan.isPending ? "Saving…" : "Set target"}
      </Button>
    </form>
  );
}
