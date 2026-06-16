import EmptyState from "./EmptyState";

// Small vertical bar chart for daily series (energy balance / expenditure).
// Bars grow from a baseline and diverge: values below the baseline render in a
// muted/danger tone. Gap-aware (null = no bar). Rounded top corners.
// Dependency-free, server-renderable SVG.
export default function MiniBars({
  bars,
  height = 80,
  ariaLabel,
  baseline = 0,
}: {
  bars: { value: number | null; color?: string; label?: string }[];
  height?: number;
  ariaLabel: string;
  baseline?: number;
}) {
  const present = bars.filter((b): b is { value: number; color?: string; label?: string } => b.value != null);
  if (present.length === 0) {
    return <EmptyState message="No data yet" />;
  }

  const W = 360;
  const H = height;
  const pad = { l: 4, r: 4, t: 8, b: 8 };

  // Domain spans the baseline plus all values, so diverging bars stay in frame.
  const vals = present.map((b) => b.value);
  let min = Math.min(baseline, ...vals);
  let max = Math.max(baseline, ...vals);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  // A little headroom so the tallest bar doesn't kiss the edge.
  const span = max - min;
  min -= span * 0.04;
  max += span * 0.04;

  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const basePxY = y(baseline);

  const n = bars.length;
  const innerW = W - pad.l - pad.r;
  const slot = innerW / n;
  const gap = Math.min(slot * 0.28, 6);
  const barW = Math.max(slot - gap, 1);
  const radius = Math.min(barW / 2, 3);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      style={{ display: "block" }}
    >
      {/* baseline reference */}
      <line x1={pad.l} x2={W - pad.r} y1={basePxY} y2={basePxY} stroke="var(--border)" strokeWidth={1} />
      {bars.map((b, i) => {
        if (b.value == null) return null;
        const cx = pad.l + slot * i + (slot - barW) / 2;
        const above = b.value >= baseline;
        const vy = y(b.value);
        const top = above ? vy : basePxY;
        const h = Math.max(Math.abs(basePxY - vy), 0.5);
        // Diverging color: explicit color wins; else above=accent, below=muted danger.
        const color = b.color ?? (above ? "var(--accent)" : "var(--danger)");
        // Round only the outward-facing corners.
        return (
          <rect
            key={i}
            x={cx}
            y={top}
            width={barW}
            height={h}
            rx={radius}
            ry={radius}
            fill={color}
            opacity={above ? 0.9 : 0.55}
          />
        );
      })}
    </svg>
  );
}
