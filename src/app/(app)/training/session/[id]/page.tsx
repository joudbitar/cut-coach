import { getSessionDetail, getProgramDay, getLastSetSummary } from "@/lib/data";
import { overloadCue } from "@/lib/program";
import { finishWorkout } from "@/app/actions";
import SetLogger from "@/components/SetLogger";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, sets } = await getSessionDetail(id);
  if (!session) notFound();
  const day = session.day_key ? await getProgramDay(session.day_key) : null;

  const cues = await Promise.all(
    (day?.exercises ?? []).map(async (e) => {
      const last = await getLastSetSummary(e.id, id);
      return { id: e.id, cue: overloadCue(last, e.target_reps), last };
    })
  );
  const cueMap = new Map(cues.map((c) => [c.id, c]));

  const cueColor = (tone: string) =>
    tone === "up" ? "var(--good)" : tone === "flag" ? "var(--warn)" : "var(--muted)";

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700 }}>{session.day_name ?? "Workout"}</h1>
          <p className="muted" style={{ fontSize: 12 }}>{session.finished_at ? "Completed" : "In progress"}</p>
        </div>
        <Link href="/training" className="btn-ghost" style={{ padding: "8px 12px", fontSize: 13 }}>Back</Link>
      </div>

      {day?.exercises.map((e) => {
        const info = cueMap.get(e.id);
        const existing = sets
          .filter((s) => s.exercise_id === e.id)
          .map((s) => ({ id: s.id, set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps, rpe: s.rpe }));
        return (
          <section className="card" key={e.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>{e.name}</h2>
              <span className="muted" style={{ fontSize: 12 }}>{e.target_sets} × {e.target_reps}</span>
            </div>
            {info && (
              <p style={{ fontSize: 12, margin: "4px 0 10px", color: cueColor(info.cue.tone) }}>
                {info.cue.tone === "up" ? "▲ " : info.cue.tone === "flag" ? "⚠ " : "→ "}
                {info.cue.text}
              </p>
            )}
            <SetLogger sessionId={id} exerciseId={e.id} exerciseName={e.name} existing={existing} />
          </section>
        );
      })}

      {!session.finished_at && (
        <form action={finishWorkout}>
          <input type="hidden" name="session_id" value={id} />
          <button className="btn" style={{ background: "var(--good)" }}>Finish workout</button>
        </form>
      )}
    </main>
  );
}
