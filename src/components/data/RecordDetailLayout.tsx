export function RecordDetailLayout({
  title,
  subtitle,
  badge,
  actions,
  main,
  activity,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  main: React.ReactNode;
  activity: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-lg font-semibold">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Single-column on mobile, two-pane on desktop (§7) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="min-w-0">{main}</div>
        <div className="min-w-0">{activity}</div>
      </div>
    </div>
  );
}
