import { getProgram, getWorkoutHistory } from "@/lib/data";
import { startWorkout } from "@/app/actions";
import { prettyDate } from "@/lib/dates";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const [program, history] = await Promise.all([getProgram(), getWorkoutHistory()]);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Training</h1>
        <p className="muted" style={{ fontSize: 13 }}>4-day Upper/Lower · retention split · hold loads, don&apos;t chase PRs</p>
      </div>

      {program.map((day) => (
        <section className="card" key={day.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>{day.name}</h2>
            <form action={startWorkout}>
              <input type="hidden" name="day_key" value={day.key} />
              <button className="btn" style={{ width: "auto", padding: "8px 16px", fontSize: 14 }}>Start</button>
            </form>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {day.exercises.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{e.name}</span>
                <span className="muted">{e.target_sets} × {e.target_reps}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="card">
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>History</h2>
        {history.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No workouts logged yet. Start one above.</p>
        ) : (
          history.map((h) => (
            <Link
              key={h.id}
              href={`/training/session/${h.id}`}
              style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", textDecoration: "none", color: "var(--fg)" }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{h.day_name ?? "Workout"}</div>
                <div className="muted" style={{ fontSize: 12 }}>{prettyDate(h.started_at.slice(0, 10))} · {h.setCount} sets</div>
              </div>
              <span className="chip">{h.finished_at ? "done" : "open"}</span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
