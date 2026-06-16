import TrendAreaChart, { type Series } from "./TrendAreaChart";
import StatTile from "./StatTile";
import EmptyState from "./EmptyState";
import { fmtWeight, fmtInt, fmtDelta } from "@/lib/format";
import { adjustmentGuidance, type TrendPoint } from "@/lib/trend";
import { daysBetween } from "@/lib/dates";

export type CutProgressCardProps = {
  trend: TrendPoint[]; // ascending by date; raw weight + 7-day avg
  slope: number | null; // weeklySlope() kg/wk, negative = losing
  startWeightKg: number; // PROFILE.startWeightKg
  goalWeightKg: number; // PROFILE.goalWeightKg
};

// Map the guidance tone to a StatTile delta tone ("info" reads as muted).
function slopeTone(t: "info" | "good" | "warn"): "good" | "warn" | "muted" {
  return t === "info" ? "muted" : t;
}

// Left-border accent color for the coach line, by guidance tone.
function borderColor(t: "info" | "good" | "warn"): string {
  if (t === "good") return "var(--good)";
  if (t === "warn") return "var(--warn)";
  return "var(--accent)";
}

// "Jun 16" from a YYYY-MM-DD string. Local, deterministic, no Date.now().
function monthDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

export default function CutProgressCard({
  trend,
  slope,
  startWeightKg,
  goalWeightKg,
}: CutProgressCardProps) {
  // Window caption: span of the logged trend.
  const caption =
    trend.length > 0
      ? `${monthDay(trend[0].date)} – ${monthDay(trend[trend.length - 1].date)}`
      : "No weigh-ins yet";

  // weekIndex from days since first point (default 1 if no data).
  const weekIndex =
    trend.length > 0
      ? Math.floor(
          daysBetween(trend[0].date, trend[trend.length - 1].date) / 7
        ) + 1
      : 1;
  const guidance = adjustmentGuidance(slope, weekIndex);

  function header() {
    return (
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Cut Progress</h2>
        <p className="muted" style={{ fontSize: 12 }}>
          {caption}
        </p>
      </div>
    );
  }

  // No data at all.
  if (trend.length === 0) {
    return (
      <section className="card">
        {header()}
        <EmptyState message="Log your morning weight to start tracking your cut." />
      </section>
    );
  }

  // Current weight: latest non-null avg, else latest raw weight.
  const latestAvg = [...trend].reverse().find((p) => p.avg != null)?.avg ?? null;
  const latestWeight = trend[trend.length - 1].weight;
  const current = latestAvg ?? latestWeight;

  // kg to goal + % of cut complete (start → goal).
  const toGoal = current - goalWeightKg;
  const totalDrop = startWeightKg - goalWeightKg;
  const pct =
    totalDrop > 0
      ? Math.max(0, Math.min(1, (startWeightKg - current) / totalDrop))
      : 0;

  const statRow = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <StatTile
        label="Current (7-day avg)"
        value={`${fmtWeight(current)} kg`}
      />
      <StatTile
        label="Weekly pace"
        value={slope == null ? "—" : `${fmtDelta(slope, { decimals: 2, unit: " kg/wk" })}`}
        delta={
          slope == null
            ? undefined
            : { text: guidance.tone === "good" ? "on target" : guidance.tone === "warn" ? "off pace" : "settling", tone: slopeTone(guidance.tone) }
        }
      />
      <StatTile
        label="To goal"
        value={`${fmtWeight(toGoal)} kg`}
        sub={`${fmtInt(pct * 100)}% of cut complete`}
      />
    </div>
  );

  // Single point: can't draw a trend line — show stats + a muted note.
  if (trend.length < 2) {
    return (
      <section className="card">
        {header()}
        {statRow}
        <p className="muted" style={{ fontSize: 13, padding: "12px 8px", margin: 0 }}>
          Log a few more weigh-ins to see your trend.
        </p>
      </section>
    );
  }

  // Build the three chart series on a shared y-scale.
  const rawValues = trend.map((p) => p.weight);
  const avgValues = trend.map((p) => p.avg);

  // Dashed goal-pace reference: straight line from the first trend point's
  // weight (fall back to startWeightKg) toward goalWeightKg, linearly
  // interpolated across the index range.
  const startVal = trend[0].weight ?? startWeightKg;
  const lastIdx = trend.length - 1;
  const goalPace: (number | null)[] = trend.map(
    (_, i) => startVal + (goalWeightKg - startVal) * (i / lastIdx)
  );

  const series: Series[] = [
    { values: rawValues, stroke: "var(--accent)", showDots: true, label: "Weight" },
    { values: avgValues, stroke: "var(--accent-2)", fill: "var(--accent-2)", label: "7-day avg" },
    { values: goalPace, stroke: "var(--muted)", dashed: true, label: "Goal pace" },
  ];

  // Sparse x labels: first / mid / last as "MMM D".
  const midIdx = Math.floor(lastIdx / 2);
  const xLabels = trend.map((p, i) =>
    i === 0 || i === midIdx || i === lastIdx ? monthDay(p.date) : ""
  );

  return (
    <section className="card">
      {header()}
      {statRow}
      <TrendAreaChart
        series={series}
        xLabels={xLabels}
        height={200}
        ariaLabel="Cut progress: weight, 7-day average, and goal pace"
        yFormat={fmtWeight}
      />
      <div
        style={{
          marginTop: 12,
          padding: "8px 12px",
          borderLeft: `3px solid ${borderColor(guidance.tone)}`,
          background: "var(--bg-elev)",
          borderRadius: 6,
          fontSize: 13,
        }}
      >
        {guidance.text}
      </div>
    </section>
  );
}
