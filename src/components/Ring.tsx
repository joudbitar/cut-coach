export default function Ring({
  value,
  target,
  label,
  unit,
  color = "var(--accent)",
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  color?: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const remaining = Math.max(target - value, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={108} height={108} viewBox="0 0 108 108">
        <circle cx={54} cy={54} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle
          cx={54}
          cy={54}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 54 54)"
        />
        <text x={54} y={50} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--fg)">
          {Math.round(value)}
        </text>
        <text x={54} y={68} textAnchor="middle" fontSize={11} fill="var(--muted)">
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
