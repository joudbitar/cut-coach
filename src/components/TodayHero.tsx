import Ring from "./Ring";
import MacroStrip from "./MacroStrip";
import { TARGETS } from "@/lib/targets";
import { fmtInt } from "@/lib/format";
import type { Meal } from "@/lib/data";

// The HERO: one dominant number (calories remaining) answers "how much room is
// left to eat today", flanked by a slim protein ring and one macro strip.
// Derives its own totals so it can sit in the meals-only Suspense boundary.
export default function TodayHero({ meals }: { meals: Meal[] }) {
  const sum = (k: "kcal" | "protein" | "fat" | "carb" | "fiber") =>
    meals.reduce((s, m) => s + (m[k] ?? 0), 0);
  const kcal = sum("kcal");
  const protein = sum("protein");
  const pendingCount = meals.filter((m) => m.kcal == null).length;

  const remaining = Math.max(TARGETS.kcal - kcal, 0);
  const over = kcal > TARGETS.kcal;

  return (
    <section className="hero">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div className="hero-num">{fmtInt(remaining)}</div>
          <div className="cap" style={{ marginTop: 2 }}>
            {over ? `${fmtInt(kcal - TARGETS.kcal)} kcal over ${fmtInt(TARGETS.kcal)}` : `kcal left of ${fmtInt(TARGETS.kcal)}`}
          </div>
        </div>
        <Ring
          value={protein}
          target={TARGETS.protein}
          label="Protein"
          unit="g"
          color="var(--accent-2)"
          size={84}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <MacroStrip
          fat={{ value: sum("fat"), target: TARGETS.fat }}
          carb={{ value: sum("carb"), target: TARGETS.carb }}
          fiber={{ value: sum("fiber"), target: TARGETS.fiber }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {pendingCount > 0 && (
          <span className="pill-pending">{pendingCount} pending</span>
        )}
        <span className="cap">
          ~{fmtInt(TARGETS.snackBudgetKcal)} kcal earmarked for evening snacks
        </span>
      </div>
    </section>
  );
}
