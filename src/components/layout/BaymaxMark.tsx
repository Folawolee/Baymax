/** A low-contrast, circular Baymax face mark with joined sensors. */
export function BaymaxMark() {
  return (
    <span aria-hidden="true" className="inline-grid size-8 place-items-center rounded-full bg-muted/70 text-muted-foreground">
      <span className="relative flex items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span className="h-px w-2 bg-current" />
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    </span>
  );
}
