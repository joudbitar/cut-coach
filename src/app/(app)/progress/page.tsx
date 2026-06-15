import { getWeights, getMeasurements, getPhotos } from "@/lib/data";
import { withRollingAvg, weeklySlope, adjustmentGuidance } from "@/lib/trend";
import { localDateStr, prettyDate, daysBetween } from "@/lib/dates";
import { PROFILE } from "@/lib/targets";
import WeightChart from "@/components/WeightChart";
import { WeightForm, MeasurementForm, PhotoForm } from "@/components/ProgressForms";

export const dynamic = "force-dynamic";

function DueBadge({ due }: { due: boolean }) {
  return due ? <span className="chip chip-due">● due today</span> : <span className="chip">✓ up to date</span>;
}

export default async function ProgressPage() {
  const today = localDateStr();
  const [weights, measurements, photos] = await Promise.all([
    getWeights(),
    getMeasurements(),
    getPhotos(),
  ]);

  const trend = withRollingAvg(weights.map((w) => ({ date: w.measured_on, weight: w.weight_kg })));
  const slope = weeklySlope(weights.map((w) => ({ date: w.measured_on, weight: w.weight_kg })));
  const firstDate = weights[0]?.measured_on;
  const weekIndex = firstDate ? Math.floor(daysBetween(firstDate, today) / 7) + 1 : 1;
  const guidance = adjustmentGuidance(slope, weekIndex);

  const latestAvg = [...trend].reverse().find((t) => t.avg != null)?.avg ?? null;
  const lastWeightDate = weights[weights.length - 1]?.measured_on;
  const weightDue = lastWeightDate !== today;
  const lastMeas = measurements[measurements.length - 1];
  const measDue = !lastMeas || daysBetween(lastMeas.measured_on, today) >= 7;
  const lastPhoto = photos[0];
  const photoDue = !lastPhoto || daysBetween(lastPhoto.taken_on, today) >= 7;

  const toGoal = latestAvg != null ? (latestAvg - PROFILE.goalWeightKg).toFixed(1) : null;

  const guidanceColor =
    guidance.tone === "good" ? "var(--good)" : guidance.tone === "warn" ? "var(--warn)" : "var(--accent)";

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Progress</h1>

      {/* Weight */}
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Weight trend</h2>
          <DueBadge due={weightDue} />
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
          <div>
            <div className="label">7-day avg</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{latestAvg != null ? `${latestAvg} kg` : "—"}</div>
          </div>
          <div>
            <div className="label">Trend</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: slope != null && slope < 0 ? "var(--good)" : "var(--fg)" }}>
              {slope != null ? `${slope > 0 ? "+" : ""}${slope} kg/wk` : "—"}
            </div>
          </div>
          <div>
            <div className="label">To goal</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{toGoal != null ? `${toGoal} kg` : "—"}</div>
          </div>
        </div>
        <WeightChart points={trend} />
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "var(--bg-elev)", borderLeft: `3px solid ${guidanceColor}` }}>
          <div className="label" style={{ color: guidanceColor }}>Week {weekIndex} guidance</div>
          <p style={{ fontSize: 13, marginTop: 2 }}>{guidance.text}</p>
        </div>
        <div style={{ marginTop: 12 }}>
          <WeightForm />
        </div>
      </section>

      {/* Measurements */}
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Measurements &amp; BF%</h2>
          <DueBadge due={measDue} />
        </div>
        {lastMeas && (
          <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            Latest: waist {lastMeas.waist_cm}cm · neck {lastMeas.neck_cm}cm →{" "}
            <strong style={{ color: "var(--fg)" }}>{lastMeas.bf_pct}% BF</strong> ({prettyDate(lastMeas.measured_on)})
          </p>
        )}
        <MeasurementForm />
        {measurements.length > 1 && (
          <div style={{ marginTop: 12 }}>
            <div className="label" style={{ marginBottom: 4 }}>History</div>
            {[...measurements].reverse().map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="muted">{prettyDate(m.measured_on)}</span>
                <span>W {m.waist_cm} · N {m.neck_cm} · <strong>{m.bf_pct}%</strong></span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Photos */}
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Progress photos</h2>
          <DueBadge due={photoDue} />
        </div>
        <PhotoForm />
        {photos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>
            {photos.map((p) => (
              <div key={p.id} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.taken_on} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
                <span style={{ position: "absolute", bottom: 4, left: 4, fontSize: 9, background: "rgba(0,0,0,.6)", padding: "1px 5px", borderRadius: 6 }}>{prettyDate(p.taken_on)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
