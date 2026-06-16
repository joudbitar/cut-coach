import { slugId } from "@/lib/format";

// Compact, gap-aware line (+ optional soft area) sparkline. No axes/labels.
// Dependency-free, server-renderable SVG. Draws the line across null gaps but
// only places dots/area where data exists.
export default function Sparkline({
  data,
  stroke = "var(--accent)",
  fill,
  height = 36,
  width = 120,
  ariaLabel,
}: {
  data: (number | null)[];
  stroke?: string;
  fill?: string;
  height?: number;
  width?: number;
  ariaLabel: string;
}) {
  const W = width;
  const H = height;
  const pad = { l: 2, r: 2, t: 4, b: 4 };

  const present = data.filter((v): v is number => v != null);
  if (present.length < 2) {
    return (
      <span className="muted" aria-label={ariaLabel} style={{ fontSize: 12 }}>
        —
      </span>
    );
  }

  let min = Math.min(...present);
  let max = Math.max(...present);
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const n = data.length;
  const x = (i: number) =>
    pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

  // Build the line path, breaking into sub-paths only where consecutive points
  // both exist (so the line spans gaps as one continuous stroke per segment).
  const linePath = buildLinePath(data, x, y);

  const id = `spark-${slugId(ariaLabel)}`;
  const gradId = `${id}-grad`;

  // Area fill anchors down to the baseline of the chart.
  const areaPath =
    fill && linePath
      ? buildAreaPath(data, x, y, H - pad.b)
      : null;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      style={{ display: "block", overflow: "visible" }}
    >
      {fill && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.32} />
            <stop offset="100%" stopColor={fill} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {areaPath && <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {data.map((v, i) =>
        v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={1.6} fill={stroke} />
      )}
    </svg>
  );
}

// Continuous line that spans gaps: emit M at the first present point, then L
// for each subsequent present point regardless of intervening nulls.
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
