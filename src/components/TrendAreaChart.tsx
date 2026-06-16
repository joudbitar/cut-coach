import EmptyState from "./EmptyState";
import { slugId } from "@/lib/format";

export type Series = {
  values: (number | null)[];
  stroke: string;
  fill?: string;
  showDots?: boolean;
  dashed?: boolean;
  label?: string;
};

// Premium full chart: gradient area fill + subtle glow + rounded caps + faint
// gridlines + min/max axis labels. Supports multiple overlaid series sharing one
// y-scale (e.g. raw weight dots + avg line + dashed goal). Dependency-free,
// server-renderable SVG. Generalizes WeightChart's premium idiom.
export default function TrendAreaChart({
  series,
  xLabels,
  height = 180,
  ariaLabel,
  yFormat = (v) => v.toFixed(1),
}: {
  series: Series[];
  xLabels?: string[];
  height?: number;
  ariaLabel: string;
  yFormat?: (v: number) => string;
}) {
  const W = 360;
  const H = height;
  const pad = { l: 34, r: 12, t: 14, b: xLabels && xLabels.length ? 22 : 12 };

  // y-domain across all non-null values of all series, with ~12% padding.
  const all: number[] = [];
  let n = 0;
  for (const s of series) {
    n = Math.max(n, s.values.length);
    for (const v of s.values) if (v != null) all.push(v);
  }

  if (all.length === 0 || n < 2) {
    return <EmptyState message="Not enough data yet" />;
  }

  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.12;
  max += span * 0.12;

  const x = (i: number) =>
    pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

  const id = `trend-${slugId(ariaLabel)}`;
  const glowId = `${id}-glow`;
  const baseY = H - pad.b;

  const gridVals = [min + (max - min) * 0.2, (min + max) / 2, max - (max - min) * 0.2];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      style={{ display: "block" }}
    >
      <defs>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {series.map((s, si) =>
          s.fill ? (
            <linearGradient key={si} id={`${id}-grad-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.fill} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.fill} stopOpacity={0} />
            </linearGradient>
          ) : null
        )}
      </defs>

      {/* faint gridlines + y axis labels */}
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={y(gv)}
            y2={y(gv)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text x={4} y={y(gv) + 4} fontSize={9} fill="var(--muted)">
            {yFormat(gv)}
          </text>
        </g>
      ))}

      {/* x axis labels (sparse: first / mid / last) */}
      {xLabels && xLabels.length > 0 &&
        sparseXIndices(xLabels.length).map((i) => (
          <text
            key={`xl-${i}`}
            x={x(i)}
            y={H - 6}
            fontSize={9}
            fill="var(--muted)"
            textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
          >
            {xLabels[i]}
          </text>
        ))}

      {/* area fills (drawn first, behind lines) */}
      {series.map((s, si) => {
        if (!s.fill) return null;
        const area = buildAreaPath(s.values, x, y, baseY);
        return area ? (
          <path key={`area-${si}`} d={area} fill={`url(#${id}-grad-${si})`} stroke="none" />
        ) : null;
      })}

      {/* lines */}
      {series.map((s, si) => {
        const line = buildLinePath(s.values, x, y);
        if (!line) return null;
        return (
          <path
            key={`line-${si}`}
            d={line}
            fill="none"
            stroke={s.stroke}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.dashed ? "5 5" : undefined}
            filter={s.dashed ? undefined : `url(#${glowId})`}
          />
        );
      })}

      {/* dots */}
      {series.map((s, si) =>
        s.showDots
          ? s.values.map((v, i) =>
              v == null ? null : (
                <circle key={`dot-${si}-${i}`} cx={x(i)} cy={y(v)} r={2.6} fill={s.stroke} opacity={0.9} />
              )
            )
          : null
      )}
    </svg>
  );
}

function sparseXIndices(len: number): number[] {
  if (len <= 1) return [0];
  if (len === 2) return [0, 1];
  return [0, Math.floor((len - 1) / 2), len - 1];
}

function buildLinePath(
  data: (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number
): string {
  let d = "";
  let started = false;
  data.forEach((v, i) => {
    if (v == null) return;
    d += `${started ? "L" : "M"}${x(i)},${y(v)} `;
    started = true;
  });
  return d.trim();
}

function buildAreaPath(
  data: (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number,
  baseY: number
): string {
  const pts: { i: number; v: number }[] = [];
  data.forEach((v, i) => {
    if (v != null) pts.push({ i, v });
  });
  if (pts.length < 2) return "";
  let d = `M${x(pts[0].i)},${baseY} `;
  pts.forEach((p) => {
    d += `L${x(p.i)},${y(p.v)} `;
  });
  d += `L${x(pts[pts.length - 1].i)},${baseY} Z`;
  return d;
}
