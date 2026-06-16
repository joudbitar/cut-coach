import StatTile from "./StatTile";
import { fmtInt, fmtDelta } from "@/lib/format";
import { avgNonNull } from "@/lib/energy";
import { toWeeks } from "@/lib/training";
import type { DayRow, SessionVolume } from "@/lib/data";
import type { TrendPoint } from "@/lib/trend";

// Last non-null value of a gap-aware series.
function latest(vals: (number | null)[]): number | null {
  for (let i = vals.length - 1; i >= 0; i--) if (vals[i] != null) return vals[i];
  return null;
}

// Newest minus prior across the present values, or null.
function priorDelta(vals: (number | null)[]): number | null {
  const present = vals.filter((v): v is number => v != null);
  if (present.length < 2) return null;
  return present[present.length - 1] - present[present.length - 2];
}

// The "Apple Watch summary": four numbers, four trends, one card. Collapses
// CutProgress + EnergyBalance + Training + Recovery into a glanceable grid; the
// full cards survive below the Details fold.
export default function WeekGlance({
  trend,
  slope,
  dayRows,
  sessions,
}: {
  trend: TrendPoint[];
  slope: number | null;
  dayRows: DayRow[];
  sessions: SessionVolume[];
}) {
  // 1. Weight pace
  const loss = slope == null ? null : -slope;
  const paceTone =
    loss == null ? "muted" : loss >= 0.8 && loss <= 1.2 ? "good" : ("warn" as const);
  const paceTile = (
    <StatTile
      label="Weight pace"
      value={slope == null ? "—" : fmtDelta(slope, { decimals: 2, unit: " kg/wk" })}
      delta={
        slope == null
          ? undefined
          : { text: paceTone === "good" ? "on target" : loss! < 0.8 ? "off pace" : "fast", tone: paceTone }
      }
      spark={trend.map((p) => p.avg)}
      sparkColor="var(--accent-2)"
    />
  );

  // 2. Avg deficit (intake − expenditure)
  const avgBalance = avgNonNull(dayRows.map((d) => d.energyBalance));
  const deficitTile = (
    <StatTile
      label="Avg deficit"
      value={avgBalance == null ? "—" : fmtDelta(avgBalance, { unit: " kcal/day" })}
      delta={
        avgBalance == null
          ? undefined
          : avgBalance < 0
          ? { text: "deficit", tone: "good" }
          : { text: "surplus", tone: "warn" }
      }
      spark={dayRows.map((d) => d.energyBalance)}
      sparkColor="var(--good)"
    />
  );

  // 3. Training volume (latest week tonnage, delta vs prior week)
  const weeks = toWeeks(sessions);
  const wLatest = weeks[weeks.length - 1] ?? null;
  const wPrev = weeks.length > 1 ? weeks[weeks.length - 2] : null;
  const volDelta = wLatest && wPrev ? wLatest.tonnageKg - wPrev.tonnageKg : null;
  const volumeTile = (
    <StatTile
      label="Training vol"
      value={wLatest ? `${fmtInt(wLatest.tonnageKg)} kg` : "—"}
      delta={
        volDelta == null
          ? undefined
          : { text: fmtDelta(volDelta, { unit: " kg" }), tone: volDelta < 0 ? "warn" : "good" }
      }
      spark={weeks.map((w) => w.tonnageKg)}
      sparkColor="var(--accent)"
    />
  );

  // 4. Recovery (sleep hours headline, HRV trend as the single proxy)
  const sleepHours = dayRows.map((d) => d.sleepHours);
  const hrv = dayRows.map((d) => d.hrvMs);
  const sleepLatest = latest(sleepHours);
  const hrvDelta = priorDelta(hrv);
  const recoveryTile = (
    <StatTile
      label="Recovery"
      value={sleepLatest == null ? "—" : `${sleepLatest.toFixed(1)} h`}
      delta={
        hrvDelta == null
          ? undefined
          : { text: `HRV ${fmtDelta(hrvDelta, { unit: " ms" })}`, tone: hrvDelta > 0 ? "good" : hrvDelta < 0 ? "warn" : "muted" }
      }
      spark={sleepHours}
      sparkColor="var(--accent)"
    />
  );

  return (
    <section className="card">
      <h2 className="card-title" style={{ marginBottom: 12 }}>This week</h2>
      <div className="glance-grid">
        {paceTile}
        {deficitTile}
        {volumeTile}
        {recoveryTile}
      </div>
    </section>
  );
}
