import StatTile from "@/components/StatTile";
import EmptyState from "@/components/EmptyState";
import { fmtWeight, fmtDelta } from "@/lib/format";
import type { Measurement } from "@/lib/data";

// Homepage dashboard card: "am I losing fat, not just scale weight?".
// Tracks waist (cm) and body-fat (%). Pure server component — no client hooks,
// no charting lib. Measurements are sparse, so the 1-row and empty states matter.
export type CompositionCardProps = { measurements: Measurement[] };

export default function CompositionCard({ measurements }: CompositionCardProps) {
  const heading = (
    <>
      <h2>Composition</h2>
      <p className="muted" style={{ fontSize: 13, margin: "2px 0 12px" }}>
        Waist &amp; body fat
      </p>
    </>
  );

  if (measurements.length === 0) {
    return (
      <section className="card">
        {heading}
        <EmptyState message="Add a measurement to track waist and body fat." />
      </section>
    );
  }

  const latest = measurements[measurements.length - 1];
  const first = measurements[0];

  // Series for sparklines (bf_pct preserves nulls so the line is gap-aware).
  const waistSeries = measurements.map((m) => m.waist_cm);
  const bfSeries = measurements.map((m) => m.bf_pct);

  // Latest/first non-null body-fat readings for the value + delta-since-start.
  const bfPresent = measurements.filter(
    (m): m is Measurement & { bf_pct: number } => m.bf_pct != null
  );
  const latestBf = bfPresent.length > 0 ? bfPresent[bfPresent.length - 1].bf_pct : null;
  const firstBf = bfPresent.length > 0 ? bfPresent[0].bf_pct : null;

  const single = measurements.length === 1;

  // Shrinking waist / body fat on a cut is good → negative delta is "good".
  const waistDelta =
    !single && first
      ? {
          text: fmtDelta(latest.waist_cm - first.waist_cm, { decimals: 1, unit: " cm" }),
          tone:
            latest.waist_cm < first.waist_cm
              ? ("good" as const)
              : latest.waist_cm > first.waist_cm
                ? ("warn" as const)
                : ("muted" as const),
        }
      : undefined;

  const bfDelta =
    !single && latestBf != null && firstBf != null && bfPresent.length > 1
      ? {
          text: fmtDelta(latestBf - firstBf, { decimals: 1, unit: " %" }),
          tone:
            latestBf < firstBf
              ? ("good" as const)
              : latestBf > firstBf
                ? ("warn" as const)
                : ("muted" as const),
        }
      : undefined;

  const sub = single ? "Add another measurement to see your trend." : undefined;

  return (
    <section className="card">
      {heading}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <StatTile
          label="Waist"
          value={`${fmtWeight(latest.waist_cm)} cm`}
          delta={waistDelta}
          spark={single ? undefined : waistSeries}
          sparkColor="var(--accent)"
          sub={sub}
        />
        <StatTile
          label="Body Fat"
          value={latestBf != null ? `${fmtWeight(latestBf)} %` : "—"}
          delta={bfDelta}
          spark={single || latestBf == null ? undefined : bfSeries}
          sparkColor="var(--accent-2)"
          sub={latestBf == null ? "not logged" : sub}
        />
      </div>

      <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
        Neck {fmtWeight(latest.neck_cm)} cm
      </p>
    </section>
  );
}
