import { getMealsForLocalDate } from "@/lib/data";
import { localDateStr, prettyDate } from "@/lib/dates";
import { TARGETS } from "@/lib/targets";
import Ring from "@/components/Ring";
import MealForm from "@/components/MealForm";
import MealItem from "@/components/MealItem";

export const dynamic = "force-dynamic";

function MacroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span className="muted">{label}</span>
        <span>{Math.round(value)} / {target}{unit}</span>
      </div>
      <div style={{ height: 8, background: "var(--bg-elev)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 999 }} />
      </div>
    </div>
  );
}

export default async function TodayPage() {
  const today = localDateStr();
  const meals = await getMealsForLocalDate(today);

  const sum = (k: "kcal" | "protein" | "fat" | "carb" | "fiber") =>
    meals.reduce((s, m) => s + (m[k] ?? 0), 0);
  const kcal = sum("kcal");
  const protein = sum("protein");
  const pendingCount = meals.filter((m) => m.kcal == null).length;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Today</h1>
        <p className="muted" style={{ fontSize: 13 }}>{prettyDate(today)}</p>
      </div>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <Ring value={kcal} target={TARGETS.kcal} label="Calories" unit="" color="var(--accent)" />
          <Ring value={protein} target={TARGETS.protein} label="Protein" unit="g" color="var(--accent-2)" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <MacroBar label="Fat" value={sum("fat")} target={TARGETS.fat} unit="g" />
          <MacroBar label="Carbs" value={sum("carb")} target={TARGETS.carb} unit="g" />
          <MacroBar label="Fiber" value={sum("fiber")} target={TARGETS.fiber} unit="g" />
        </div>
        {pendingCount > 0 && (
          <p style={{ marginTop: 12, fontSize: 12 }}>
            <span className="pill-pending">{pendingCount} pending</span>{" "}
            <span className="muted">— totals exclude un-enriched meals.</span>
          </p>
        )}
      </section>

      <section className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="label">Snack budget</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>~{TARGETS.snackBudgetKcal} kcal</div>
        </div>
        <p className="muted" style={{ fontSize: 11, maxWidth: 200, textAlign: "right" }}>
          Earmarked for high-protein, high-volume snacks to ride out the evening cravings.
        </p>
      </section>

      <section className="card">
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Log a meal</h2>
        <MealForm />
      </section>

      <section className="card">
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Today&apos;s entries</h2>
        {meals.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, paddingTop: 8 }}>Nothing logged yet. Fasting until ~1-2pm is fine — protein + fiber + water when the cravings hit.</p>
        ) : (
          <div>
            {meals.map((m) => (
              <MealItem key={m.id} meal={m} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
