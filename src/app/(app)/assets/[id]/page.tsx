"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { scopeLabel } from "@/lib/scopes";
import { RecordDetailLayout } from "@/components/data/RecordDetailLayout";
import { EmptyState } from "@/components/data/EmptyState";
import { StatusBadge, type Status } from "@/components/data/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

function statusMeta(status: string): { status: Status; label: string } {
  switch (status) {
    case "OPERATIONAL":
      return { status: "good", label: "Operational" };
    case "UNDER_MAINTENANCE":
      return { status: "warn", label: "Under maintenance" };
    case "OUT_OF_SERVICE":
      return { status: "bad", label: "Out of service" };
    default:
      return { status: "neutral", label: status };
  }
}

const NEXT_MAINTENANCE_STATUS: Record<string, "IN_PROGRESS" | "COMPLETED" | null> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: null,
};

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const { data: asset, isLoading } = trpc.asset.getById.useQuery({ id });

  const [maintType, setMaintType] = useState<"PREVENTIVE" | "CORRECTIVE" | "INSPECTION">("PREVENTIVE");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setStatus = trpc.asset.setStatus.useMutation();
  const logMaintenance = trpc.asset.logMaintenance.useMutation();
  const advanceStatus = trpc.asset.updateMaintenanceStatus.useMutation();

  async function invalidateAll() {
    await utils.asset.getById.invalidate({ id });
    await utils.asset.list.invalidate();
    await utils.asset.maintenanceSummary.invalidate();
  }

  async function handleSetStatus(status: "OPERATIONAL" | "UNDER_MAINTENANCE" | "OUT_OF_SERVICE") {
    setError(null);
    try {
      await setStatus.mutateAsync({ assetId: id, status });
      await invalidateAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleLogMaintenance(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!description.trim()) return;
    try {
      await logMaintenance.mutateAsync({
        assetId: id,
        type: maintType,
        description: description.trim(),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        cost: cost ? Number(cost) : undefined,
      });
      await invalidateAll();
      setDescription("");
      setScheduledDate("");
      setCost("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log maintenance");
    }
  }

  async function handleAdvance(recordId: string, next: "IN_PROGRESS" | "COMPLETED") {
    setError(null);
    try {
      await advanceStatus.mutateAsync({ recordId, status: next });
      await invalidateAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update maintenance status");
    }
  }

  if (isLoading || !asset) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const meta = statusMeta(asset.status);

  return (
    <RecordDetailLayout
      title={asset.name}
      subtitle={`${asset.category}${asset.road || asset.facility ? ` — ${scopeLabel(asset)}` : ""}`}
      badge={<StatusBadge status={meta.status} label={meta.label} />}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSetStatus("OPERATIONAL")} disabled={setStatus.isPending}>
            Mark operational
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSetStatus("OUT_OF_SERVICE")} disabled={setStatus.isPending}>
            Mark out of service
          </Button>
        </div>
      }
      main={
        <div className="flex flex-col gap-4">
          {error && <p className="text-sm text-status-bad">{error}</p>}

          <div className="rounded-md border p-4 text-sm">
            <dl className="grid grid-cols-2 gap-2">
              <dt className="text-muted-foreground">Asset tag</dt>
              <dd>{asset.assetTag ?? "—"}</dd>
              <dt className="text-muted-foreground">Purchase date</dt>
              <dd>{asset.purchaseDate ? formatDate(asset.purchaseDate) : "—"}</dd>
            </dl>
          </div>

          <form onSubmit={handleLogMaintenance} className="flex flex-col gap-3 rounded-md border p-4">
            <p className="text-sm font-medium">Log maintenance</p>

            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={maintType}
                onChange={(e) => setMaintType(e.target.value as typeof maintType)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="PREVENTIVE">Preventive</option>
                <option value="CORRECTIVE">Corrective</option>
                <option value="INSPECTION">Inspection</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="scheduledDate">Scheduled date (optional)</Label>
                <Input id="scheduledDate" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Cost (optional)</Label>
                <Input id="cost" type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>

            <Button type="submit" disabled={!description.trim() || logMaintenance.isPending}>
              {logMaintenance.isPending ? "Saving…" : "Log maintenance"}
            </Button>
          </form>
        </div>
      }
      activity={
        asset.maintenanceRecords.length === 0 ? (
          <EmptyState title="No maintenance logged yet" />
        ) : (
          <div className="rounded-md border">
            <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Maintenance history</div>
            <ul className="divide-y">
              {asset.maintenanceRecords.map((record) => {
                const next = NEXT_MAINTENANCE_STATUS[record.status];
                return (
                  <li key={record.id} className="flex flex-col gap-1.5 px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{record.description}</span>
                      <StatusBadge
                        status={record.status === "COMPLETED" ? "good" : record.status === "IN_PROGRESS" ? "warn" : "neutral"}
                        label={record.status.replace("_", " ")}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {record.type.charAt(0) + record.type.slice(1).toLowerCase()} · logged by {record.loggedBy.name} ·{" "}
                      {formatDateTime(record.createdAt)}
                      {record.cost !== null ? ` · ${formatCurrency(record.cost)}` : ""}
                    </p>
                    {next && (
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdvance(record.id, next)}
                          disabled={advanceStatus.isPending}
                        >
                          Mark {next === "IN_PROGRESS" ? "in progress" : "completed"}
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )
      }
    />
  );
}
