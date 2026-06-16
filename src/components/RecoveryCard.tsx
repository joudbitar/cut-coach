import StatTile from "@/components/StatTile";
import EmptyState from "@/components/EmptyState";
import { fmtInt, fmtDelta } from "@/lib/format";
import { TARGETS } from "@/lib/targets";
import type { DayRow } from "@/lib/data";

export type RecoveryCardProps = { days: DayRow[] }; // ascending, gap-aware; many fields null

// Numeric DayRow fields we read here. Keyed off DayRow so casts aren't needed.
type NumKey = {
  [K in keyof DayRow]: DayRow[K] extends number | null ? K : never;
}[keyof DayRow];

// The metrics that flag a Garmin sync as fresh/stale (any signal counts).
type Metric = "sleepHours" | "hrvMs" | "restingHr" | "bodyBatteryHigh" | "steps" | "stressAvg";

// Pull one field across all days, preserving nulls/gaps (for sparklines).
function series(days: DayRow[], key: NumKey): (number | null)[] {
  return days.map((d) => d[key]);
}

// Last entry that isn't null, or null if the series is empty of data.
function latest(vals: (number | null)[]): number | null {
  for (let i = vals.length - 1; i >= 0; i--) {
    if (vals[i] != null) return vals[i];
  }
  return null;
}

// Difference between the last two non-null values (newest minus prior), or null.
function priorDelta(vals: (number | null)[]): number | null {
  const present: number[] = [];
  for (const v of vals) if (v != null) present.push(v);
  if (present.length < 2) return null;
  return present[present.length - 1] - present[present.length - 2];
}

// Decimal hours -> "Xh Ym" (e.g. 7.5 -> "7h 30m"). Rounds to nearest minute.
function fmtSleep(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

// Count of days from the latest day that carries ANY recovery signal to the end
// of the spine — used to flag a stale Garmin sync.
function daysSinceSignal(days: DayRow[], metrics: Metric[]): number {
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (metrics.some((k) => d[k] != null)) {
      return days.length - 1 - i;
    }
  }
  return days.length;
}

const ALL_METRICS: Metric[] = [
  "sleepHours",
  "hrvMs",
  "restingHr",
  "bodyBatteryHigh",
  "steps",
  "stressAvg",
];

export default function RecoveryCard({ days }: RecoveryCardProps) {
  const sleepHours = series(days, "sleepHours");
  const sleepScore = series(days, "sleepScore");
  const hrvMs = series(days, "hrvMs");
  const restingHr = series(days, "restingHr");
  const bbHigh = series(days, "bodyBatteryHigh");
  const bbLow = series(days, "bodyBatteryLow");
  const steps = series(days, "steps");
  const stress = series(days, "stressAvg");

  // Has any recovery signal anywhere? If not, the card is just an invitation.
  const hasAnySignal = ALL_METRICS.some((k) => series(days, k).some((v) => v != null));

  // Header caption: window length + freshness chip.
  const stale = daysSinceSignal(days, ALL_METRICS);
  const showStale = hasAnySignal && stale > 2 && stale < days.length;

  // --- Sleep ---------------------------------------------------------------
  const sleepLatest = latest(sleepHours);
  const sleepScoreLatest = latest(sleepScore);

  // --- HRV (up = recovered = good) ----------------------------------------
  const hrvLatest = latest(hrvMs);
  const hrvDelta = priorDelta(hrvMs);

  // --- Resting HR (lower = better, so tone is inverted) -------------------
  const rhrLatest = latest(restingHr);
  const rhrDelta = priorDelta(restingHr);

  // --- Body Battery --------------------------------------------------------
  const bbHighLatest = latest(bbHigh);
  const bbLowLatest = latest(bbLow);

  // --- Steps (vs target) ---------------------------------------------------
  const stepsLatest = latest(steps);
  const stepsDelta = stepsLatest == null ? null : stepsLatest - TARGETS.steps;

  // --- Stress (avg of available) ------------------------------------------
  const stressPresent = stress.filter((v): v is number => v != null);
  const stressAvg =
    stressPresent.length > 0
      ? stressPresent.reduce((s, v) => s + v, 0) / stressPresent.length
      : null;

  return (
    <section className="card">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: hasAnySignal ? 12 : 4,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Recovery</h2>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            {`Last ${days.length} days · Garmin`}
          </span>
          {showStale && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--warn)",
                border:
                  "1px solid color-mix(in srgb, var(--warn) 40%, var(--border))",
                borderRadius: 999,
                padding: "2px 8px",
                whiteSpace: "nowrap",
              }}
            >
              {`synced ${stale}d ago`}
            </span>
          )}
        </span>
      </div>

      {!hasAnySignal ? (
        <EmptyState message="Connect Garmin to track sleep, HRV, and recovery." />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: 12,
          }}
        >
          <StatTile
            label="Sleep"
            value={sleepLatest == null ? "" : fmtSleep(sleepLatest)}
            sub={sleepScoreLatest == null ? undefined : `score ${Math.round(sleepScoreLatest)}`}
            spark={sleepHours}
            sparkColor="var(--accent)"
          />

          <StatTile
            label="HRV"
            value={hrvLatest == null ? "" : `${Math.round(hrvLatest)} ms`}
            sub="7-night"
            delta={
              hrvDelta == null
                ? undefined
                : {
                    text: fmtDelta(hrvDelta, { unit: " ms" }),
                    tone: hrvDelta > 0 ? "good" : hrvDelta < 0 ? "warn" : "muted",
                  }
            }
            spark={hrvMs}
            sparkColor="var(--accent)"
          />

          <StatTile
            label="Resting HR"
            value={rhrLatest == null ? "" : `${Math.round(rhrLatest)} bpm`}
            sub="overnight"
            delta={
              rhrDelta == null
                ? undefined
                : {
                    // Lower RHR is better, so tone is inverted vs the sign.
                    text: fmtDelta(rhrDelta, { unit: " bpm" }),
                    tone: rhrDelta < 0 ? "good" : rhrDelta > 0 ? "warn" : "muted",
                  }
            }
            spark={restingHr}
            sparkColor="var(--accent)"
          />

          <StatTile
            label="Body Battery"
            value={bbHighLatest == null ? "" : `${Math.round(bbHighLatest)}`}
            sub={bbLowLatest == null ? undefined : `low ${Math.round(bbLowLatest)}`}
            spark={bbHigh}
            sparkColor="var(--accent-2)"
          />

          <StatTile
            label="Steps"
            value={stepsLatest == null ? "" : fmtInt(stepsLatest)}
            sub={`target ${fmtInt(TARGETS.steps)}`}
            delta={
              stepsDelta == null
                ? undefined
                : {
                    text: fmtDelta(stepsDelta),
                    tone: stepsLatest != null && stepsLatest >= TARGETS.steps ? "good" : "muted",
                  }
            }
            spark={steps}
            sparkColor="var(--accent-2)"
          />

          <StatTile
            label="Stress"
            value={stressAvg == null ? "" : `${Math.round(stressAvg)}`}
            sub="avg"
            spark={stress}
            sparkColor="var(--accent-2)"
          />
        </div>
      )}
    </section>
  );
}
