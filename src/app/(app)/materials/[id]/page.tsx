"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { scopeLabel } from "@/lib/scopes";
import { RecordDetailLayout } from "@/components/data/RecordDetailLayout";
import { ActivityLog } from "@/components/data/ActivityLog";
import { StatusBadge } from "@/components/data/StatusBadge";
import { StatTile, StatRow } from "@/components/charts/StatTile";
import { BarChart } from "@/components/charts/BarChart";
import { formatQty } from "@/lib/format";

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: material, isLoading } = trpc.material.getById.useQuery({ id });
  const { data: stockLevels } = trpc.stock.listByCompany.useQuery();
  const { data: usageLogs } = trpc.usageLog.listByMaterial.useQuery({ materialId: id });

  if (isLoading || !material) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const levelsForMaterial = (stockLevels ?? []).filter((s) => s.materialId === id);
  const totalStock = levelsForMaterial.reduce((sum, s) => sum + s.quantity, 0);
  const isLow = totalStock < material.defaultReorderPoint;
  const overrideByLocation = new Map(material.materialReorderPoints.map((rp) => [rp.locationId, rp.threshold]));

  return (
    <RecordDetailLayout
      title={material.name}
      subtitle={`Unit: ${material.unitOfMeasure}`}
      badge={<StatusBadge status={isLow ? "bad" : "good"} label={isLow ? "Below threshold" : "In stock"} />}
      main={
        <div className="flex flex-col gap-4">
          <StatRow>
            <StatTile label="Total stock" value={formatQty(totalStock)} sublabel={material.unitOfMeasure} accent={isLow ? "bad" : "good"} />
            <StatTile label="Default reorder point" value={formatQty(material.defaultReorderPoint)} sublabel={material.unitOfMeasure} />
            <StatTile label="Locations tracked" value={String(levelsForMaterial.length)} />
          </StatRow>

          {levelsForMaterial.length > 0 && (
            <div className="rounded-md border p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Stock by location</p>
              <BarChart
                items={levelsForMaterial.map((level) => {
                  const threshold = overrideByLocation.get(level.locationId) ?? material.defaultReorderPoint;
                  return {
                    id: level.locationId,
                    label: level.location.name,
                    value: level.quantity,
                    reference: threshold,
                    status: level.quantity < threshold ? "bad" : "good",
                  };
                })}
                referenceLabel="Reorder point"
                formatValue={(n) => formatQty(n, material.unitOfMeasure)}
              />
            </div>
          )}

          {material.materialReorderPoints.length > 0 && (
            <div className="rounded-md border">
              <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Reorder point overrides</div>
              <ul className="divide-y">
                {material.materialReorderPoints.map((rp) => (
                  <li key={rp.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{rp.location.name}</span>
                    <span className="tabular-nums font-medium">{formatQty(rp.threshold, material.unitOfMeasure)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
      activity={
        <ActivityLog
          entries={(usageLogs ?? []).map((log) => ({
            id: log.id,
            actor: log.loggedBy.name,
            action: `used ${formatQty(log.qty, material.unitOfMeasure)} at ${scopeLabel(log)} for "${log.task}"`,
            timestamp: log.timestamp,
          }))}
        />
      }
    />
  );
}
