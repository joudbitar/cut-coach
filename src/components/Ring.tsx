export default function Ring({
  value,
  target,
  label,
  unit,
  color = "var(--accent)",
  size = 108,
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  color?: string;
  size?: number;
}) {
  // Geometry scales with size so the hero can request a slimmer secondary ring.
  const stroke = Math.round(size * 0.093); // 10 at 108
  const r = (size - stroke) / 2 - 4;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const remaining = Math.max(target - value, 0);
  const valueFont = Math.round(size * 0.185); // 20 at 108
  const subFont = Math.max(10, Math.round(size * 0.102)); // 11 at 108
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        <text x={cx} y={cx - 4} textAnchor="middle" fontSize={valueFont} fontWeight={700} fill="var(--fg)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {Math.round(value)}
        </text>
        <text x={cx} y={cx + valueFont * 0.7} textAnchor="middle" fontSize={subFont} fill="var(--muted)">
          / {target} {unit}
        </text>
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {Math.round(remaining)} {unit} left
        </div>
      </div>
    </div>
  );
}
