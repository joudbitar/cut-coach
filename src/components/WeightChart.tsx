import { TrendPoint } from "@/lib/trend";

// Lightweight dependency-free SVG chart: raw weight dots + 7-day rolling avg line.
export default function WeightChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return <p className="muted" style={{ fontSize: 13 }}>No weigh-ins yet — log your morning weight below.</p>;
  }
  const W = 360;
  const H = 160;
  const pad = { l: 30, r: 12, t: 12, b: 20 };
  const weights = points.map((p) => p.weight);
  const avgs = points.map((p) => p.avg).filter((a): a is number => a != null);
  const all = [...weights, ...avgs];
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.1;
  max += span * 0.1;

  const n = points.length;
  const x = (i: number) =>
    pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

  const avgPath = points
    .map((p, i) => (p.avg == null ? null : `${x(i)},${y(p.avg)}`))
    .filter(Boolean)
    .map((pt, idx) => (idx === 0 ? `M${pt}` : `L${pt}`))
    .join(" ");

  const gridVals = [min + (max - min) * 0.2, (min + max) / 2, max - (max - min) * 0.2];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weight trend">
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(gv)} y2={y(gv)} stroke="var(--border)" strokeWidth={1} />
          <text x={4} y={y(gv) + 4} fontSize={9} fill="var(--muted)">{gv.toFixed(1)}</text>
        </g>
      ))}
      {avgPath && <path d={avgPath} fill="none" stroke="var(--accent-2)" strokeWidth={2.5} />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.weight)} r={2.6} fill="var(--accent)" opacity={0.85} />
      ))}
    </svg>
  );
}
