"use client";

import { useState } from "react";
import { updateMeal, deleteMeal } from "@/app/actions";
import type { Meal } from "@/lib/data";
import { prettyTime } from "@/lib/dates";

export default function MealItem({ meal }: { meal: Meal }) {
  const [editing, setEditing] = useState(false);
  const hasMacros = meal.kcal != null;

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateMeal(fd);
          setEditing(false);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", borderBottom: "1px solid var(--border)" }}
      >
        <input type="hidden" name="id" value={meal.id} />
        <textarea className="input" name="raw_text" defaultValue={meal.raw_text} rows={2} style={{ resize: "none" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {(["kcal", "protein", "fat", "carb", "fiber"] as const).map((k) => (
            <div key={k}>
              <div className="label" style={{ fontSize: 9 }}>{k === "kcal" ? "kcal" : k.slice(0, 3)}</div>
              <input
                className="input"
                name={k}
                inputMode="decimal"
                defaultValue={meal[k] ?? ""}
                style={{ padding: "8px 6px", fontSize: 13, textAlign: "center" }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit" style={{ flex: 1 }}>Save</button>
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
          <span className="chip" style={{ padding: "2px 8px" }}>{meal.slot}</span>
          <span className="muted" style={{ fontSize: 11 }}>{prettyTime(meal.eaten_at)}</span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.35 }}>{meal.raw_text}</div>
        <div style={{ marginTop: 4, fontSize: 12 }}>
          {hasMacros ? (
            <span className="muted">
              {Math.round(meal.kcal!)} kcal · {Math.round(meal.protein ?? 0)}P · {Math.round(meal.fat ?? 0)}F · {Math.round(meal.carb ?? 0)}C · {Math.round(meal.fiber ?? 0)}fib
            </span>
          ) : (
            <span className="pill-pending">macros pending</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEditing(true)}>Edit</button>
        <form action={deleteMeal}>
          <input type="hidden" name="id" value={meal.id} />
          <button className="btn-danger" style={{ padding: "4px 10px", fontSize: 12, width: "100%" }}>Del</button>
        </form>
      </div>
    </div>
  );
}
