import Sparkline from "./Sparkline";

type Tone = "good" | "warn" | "danger" | "muted";

const TONE_VAR: Record<Tone, string> = {
  good: "var(--good)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  muted: "var(--muted)",
};

// Number-led tile: big value, uppercase muted caption, optional toned signed
// delta, optional inline Sparkline. Pure presentational. Touch-friendly (44px+).
export default function StatTile({
  label,
  value,
  delta,
  spark,
  sparkColor = "var(--accent)",
  sub,
}: {
  label: string;
  value: string;
  delta?: { text: string; tone?: Tone };
  spark?: (number | null)[];
  sparkColor?: string;
  sub?: string;
}) {
  const hasValue = value != null && value !== "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minHeight: 44,
        justifyContent: "flex-start",
      }}
    >
      <div className="label">{label}</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 21,
            fontWeight: 700,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            color: hasValue ? "var(--fg)" : "var(--muted)",
          }}
        >
          {hasValue ? value : "—"}
        </span>
        {delta && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: TONE_VAR[delta.tone ?? "muted"],
            }}
          >
            {delta.text}
          </span>
        )}
      </div>

      {sub && (
        <div className="muted" style={{ fontSize: 12 }}>
          {sub}
        </div>
      )}

      {spark && spark.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <Sparkline
            data={spark}
            stroke={sparkColor}
            fill={sparkColor}
            height={28}
            ariaLabel={`${label} trend`}
          />
        </div>
      )}
    </div>
  );
}
