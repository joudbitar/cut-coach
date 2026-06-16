"use client";

import { logSet, deleteSet } from "@/app/actions";
import { useFormAction } from "@/hooks/useFormAction";
import SubmitButton from "@/components/SubmitButton";

type SetRow = { id: string; set_number: number; weight_kg: number | null; reps: number | null; rpe: number | null };

export default function SetLogger({
  sessionId,
  exerciseId,
  exerciseName,
  existing,
}: {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  existing: SetRow[];
}) {
  const { formProps, busy } = useFormAction(logSet);
  const nextSet = existing.length + 1;
  const lastWeight = existing[existing.length - 1]?.weight_kg ?? "";

  return (
    <div>
      {existing.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {existing.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span className="muted">Set {s.set_number}</span>
              <span>{s.weight_kg ?? "–"} kg × {s.reps ?? "–"} {s.rpe != null ? `@ RPE ${s.rpe}` : ""}</span>
              <form action={deleteSet}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="session_id" value={sessionId} />
                <button className="btn-danger" style={{ padding: "2px 8px", fontSize: 11 }}>×</button>
              </form>
            </div>
          ))}
        </div>
      )}
      <form
        {...formProps}
        style={{ display: "flex", gap: 6, alignItems: "flex-end" }}
      >
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="exercise_id" value={exerciseId} />
        <input type="hidden" name="exercise_name" value={exerciseName} />
        <input type="hidden" name="set_number" value={nextSet} />
        <div style={{ flex: 1 }}>
          <div className="label" style={{ fontSize: 9 }}>kg</div>
          <input className="input" name="weight_kg" inputMode="decimal" defaultValue={lastWeight} style={{ padding: "8px 6px", textAlign: "center" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ fontSize: 9 }}>reps</div>
          <input className="input" name="reps" inputMode="numeric" style={{ padding: "8px 6px", textAlign: "center" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ fontSize: 9 }}>RPE</div>
          <input className="input" name="rpe" inputMode="decimal" style={{ padding: "8px 6px", textAlign: "center" }} />
        </div>
        <SubmitButton busy={busy} style={{ width: "auto", padding: "10px 14px" }}>+{nextSet}</SubmitButton>
      </form>
    </div>
  );
}
