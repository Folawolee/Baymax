"use client";

import { useId } from "react";
import { formatCompactCurrency } from "@/lib/format";

export interface TrendPoint {
  /** Axis tick label — the month name as computed server-side. */
  month: string;
  actual: number;
  planned: number | null;
}

/**
 * Deliberately plain inline SVG rather than a charting dependency: this needs
 * two thin lines, four gridlines and no chrome, and the app ships no chart
 * library. Colours come from theme tokens so it tracks light/dark.
 */
export function TrendChart({ points, height = 160 }: { points: TrendPoint[]; height?: number }) {
  const clipId = useId();
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No expenditure recorded yet.</p>;
  }

  const width = 640;
  const padL = 52;
  const padR = 8;
  const padT = 10;
  const padB = 22;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const values = points.flatMap((p) => (p.planned !== null ? [p.actual, p.planned] : [p.actual]));
  const rawMax = Math.max(...values, 1);
  // Round the ceiling up to a clean step so gridline labels read as real money.
  const step = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const max = Math.ceil(rawMax / step) * step;

  const x = (i: number) => padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const line = (get: (p: TrendPoint) => number | null) => {
    const segs = points
      .map((p, i) => {
        const v = get(p);
        return v === null ? null : `${x(i)},${y(v)}`;
      })
      .filter((s): s is string => s !== null);
    return segs.join(" ");
  };

  const actualPath = line((p) => p.actual);
  const plannedPath = line((p) => p.planned);
  const hasPlan = points.some((p) => p.planned !== null);
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[420px]"
        role="img"
        aria-label="Expenditure against a steady plan line, last six months"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {gridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y(v)}
              y2={y(v)}
              className="stroke-border"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <text
              x={padL - 8}
              y={y(v) + 3.5}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
            >
              {formatCompactCurrency(v)}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {hasPlan && (
            <polyline
              points={plannedPath}
              fill="none"
              className="stroke-muted-foreground"
              strokeWidth={1.25}
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
          )}
          <polyline
            points={actualPath}
            fill="none"
            className="stroke-primary"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => {
            const variance = p.planned !== null ? p.actual - p.planned : null;
            return (
              <g key={i}>
                <circle cx={x(i)} cy={y(p.actual)} r={2.25} className="fill-primary" />
                {/* Generous invisible hit area so the tooltip is reachable on a thin line. */}
                <circle cx={x(i)} cy={y(p.actual)} r={12} fill="transparent">
                  <title>
                    {`${p.month} — actual ${formatCompactCurrency(p.actual)}` +
                      (p.planned !== null ? `, plan ${formatCompactCurrency(p.planned)}` : "") +
                      (variance !== null
                        ? `, ${variance >= 0 ? "over" : "under"} by ${formatCompactCurrency(Math.abs(variance))}`
                        : "")}
                  </title>
                </circle>
              </g>
            );
          })}
        </g>

        {points.map((p, i) => (
          <text
            key={p.month + i}
            x={x(i)}
            y={height - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10 }}
          >
            {p.month}
          </text>
        ))}
      </svg>

      <div className="mt-1 flex items-center gap-4 pl-[52px] text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-primary" /> Actual
        </span>
        {hasPlan && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t border-dashed border-muted-foreground" /> Steady plan
          </span>
        )}
      </div>
    </div>
  );
}
