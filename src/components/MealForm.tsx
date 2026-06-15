"use client";

import { useRef, useState } from "react";
import { addMeal } from "@/app/actions";
import { MEAL_SLOTS } from "@/lib/targets";

export default function MealForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        setBusy(true);
        await addMeal(fd);
        ref.current?.reset();
        setBusy(false);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <textarea
        className="input"
        name="raw_text"
        rows={2}
        placeholder="What did you eat? e.g. 200g chicken breast, handful of almonds"
        required
        style={{ resize: "none" }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <select className="input" name="slot" defaultValue="snack" style={{ flex: 1 }}>
          {MEAL_SLOTS.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button className="btn" type="submit" disabled={busy} style={{ width: "auto", padding: "12px 22px" }}>
          {busy ? "…" : "Log"}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 11 }}>
        Macros stay <span className="pill-pending">pending</span> until enriched in Claude Code.
      </p>
    </form>
  );
}
