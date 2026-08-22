import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  allLabel?: string;
  /** Omit the "all" chip entirely — for filters where a selection is required (e.g. a ledger that needs one location). */
  hideAll?: boolean;
}

/** Filter chips above the table, not a separate filter panel/modal (build prompt UI spec §7). */
export function FilterChips({ options, value, onChange, allLabel = "All", hideAll = false }: FilterChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {!hideAll && <Chip label={allLabel} active={value === null} onClick={() => onChange(null)} />}
      {options.map((opt) => (
        <Chip key={opt.value} label={opt.label} active={value === opt.value} onClick={() => onChange(opt.value)} />
      ))}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  );
}
