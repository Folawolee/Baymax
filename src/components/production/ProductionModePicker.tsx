"use client";

import { cn } from "@/lib/utils";

export type ProductionMode = "SIMPLE" | "BATCH_WEIGHBRIDGE";

const OPTIONS: Array<{ value: ProductionMode; title: string; description: string }> = [
  {
    value: "SIMPLE",
    title: "Simple output tracking",
    description: "Log a daily total against a target. Fits most industries.",
  },
  {
    value: "BATCH_WEIGHBRIDGE",
    title: "Weighbridge batch tracking",
    description:
      "Per-truck weigh-in/weigh-out plus a lab quality check. Fits asphalt, quarry, aggregates, ready-mix concrete, and any other production measured by the truckload.",
  },
];

interface ProductionModePickerProps {
  value: ProductionMode;
  onChange: (value: ProductionMode) => void;
}

/** How a site's production gets tracked — reused by registration (first site) and Production > Manage sites. */
export function ProductionModePicker({ value, onChange }: ProductionModePickerProps) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Production tracking mode">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md border p-3 text-left transition-colors",
              active ? "border-foreground bg-muted" : "border-border hover:bg-accent",
            )}
          >
            <p className="text-sm font-medium">{opt.title}</p>
            <p className="text-xs text-muted-foreground">{opt.description}</p>
          </button>
        );
      })}
    </div>
  );
}
