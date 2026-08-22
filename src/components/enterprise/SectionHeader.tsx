import { cn } from "@/lib/utils";

/**
 * The one section-label treatment for executive surfaces: a quiet uppercase
 * label with an optional right-aligned action. Sections are separated by rules
 * and whitespace rather than by nesting everything in a rounded card.
 */
export function SectionHeader({
  title,
  meta,
  action,
  className,
}: {
  title: string;
  /** Small supporting text shown next to the action (counts, ranges). */
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-4", className)}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="flex items-baseline gap-3">
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        {action}
      </div>
    </div>
  );
}
