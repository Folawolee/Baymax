import { cn } from "@/lib/utils";

interface QuantityInputProps {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
}

/** Large tap target + numeric keypad for outdoor, standing-up, one-handed entry (§9). */
export function QuantityInput({ value, onChange, unit, placeholder, autoFocus, id }: QuantityInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          if (/^\d*\.?\d*$/.test(next)) onChange(next);
        }}
        className={cn(
          "h-16 w-full rounded-md border border-input bg-background px-4 text-center text-3xl font-semibold tabular-nums outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      />
      {unit && (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
  );
}
