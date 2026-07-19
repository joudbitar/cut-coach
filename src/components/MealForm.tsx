"use client";

import { useFormAction } from "@/hooks/useFormAction";
import SubmitButton from "@/components/SubmitButton";
import { addMeal } from "@/app/actions";
import { MEAL_SLOTS } from "@/lib/targets";

export default function MealForm() {
  const { formProps, busy } = useFormAction(addMeal);
  return (
    <form
      {...formProps}
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
        <SubmitButton busy={busy} style={{ width: "auto", padding: "12px 22px" }}>
          Log
        </SubmitButton>
      </div>
      <p className="muted" style={{ fontSize: 11 }}>
        Macros stay <span className="pill-pending">pending</span> until a Claude session fills them in.
      </p>
    </form>
  );
}
