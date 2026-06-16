import StatTile from "@/components/StatTile";
import MiniBars from "@/components/MiniBars";
import EmptyState from "@/components/EmptyState";
import { fmtInt, fmtDelta } from "@/lib/format";
import { toWeeks } from "@/lib/training";
import type { SessionVolume } from "@/lib/data";

export type TrainingCardProps = { sessions: SessionVolume[] };

// Glanceable homepage check: am I holding training volume while cutting, to
// protect muscle? Training has its own page — this stays compact.
export default function TrainingCard({ sessions }: TrainingCardProps) {
  const hasWork =
    sessions.length > 0 &&
    sessions.some((s) => s.totalVolumeKg > 0 || s.setCount > 0);

  return (
    <section className="card">
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Training Load</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        Holding volume protects muscle on a cut.
      </p>

      {!hasWork ? (
        <EmptyState message="Log your workouts to track training volume and strength retention." />
      ) : (
        <TrainingBody sessions={sessions} />
      )}
    </section>
  );
}

function TrainingBody({ sessions }: { sessions: SessionVolume[] }) {
  const weeks = toWeeks(sessions);
  const latest = weeks[weeks.length - 1];
  const prev = weeks.length > 1 ? weeks[weeks.length - 2] : null;

  const tonnageSeries = weeks.map((w) => w.tonnageKg);
  const totalSets = sessions.reduce((acc, s) => acc + s.setCount, 0);

  // Dropping volume on a cut is a warning; flat/up is good.
  const volDelta = prev ? latest.tonnageKg - prev.tonnageKg : null;
  const delta =
    volDelta == null
      ? undefined
      : {
          text: fmtDelta(volDelta, { unit: " kg" }),
          tone: (volDelta < 0 ? "warn" : "good") as "warn" | "good",
        };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <StatTile
          label="This week"
          value={`${fmtInt(latest.tonnageKg)} kg`}
          delta={delta}
          spark={tonnageSeries}
          sparkColor="var(--accent)"
        />
        <StatTile
          label="Avg RPE"
          value={latest.avgRpe != null ? latest.avgRpe.toFixed(1) : "—"}
          sub="effort"
        />
        <StatTile label="Sets logged" value={fmtInt(totalSets)} sub="this period" />
      </div>

      <MiniBars
        bars={weeks.map((w) => ({ value: w.tonnageKg, color: "var(--accent)" }))}
        ariaLabel="Weekly training volume"
      />
    </div>
  );
}
