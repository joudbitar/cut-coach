import { getMealsGroupedByDay, getPendingMeals } from "@/lib/data";
import { prettyDate } from "@/lib/dates";
import MealItem from "@/components/MealItem";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const pendingOnly = view === "pending";
  const [groups, pending] = await Promise.all([getMealsGroupedByDay(), getPendingMeals()]);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Nutrition log</h1>

      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/nutrition" className={pendingOnly ? "btn-ghost" : "btn"} style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: "10px 0" }}>
          History
        </Link>
        <Link href="/nutrition?view=pending" className={pendingOnly ? "btn" : "btn-ghost"} style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: "10px 0" }}>
          Pending ({pending.length})
        </Link>
      </div>

      {pendingOnly ? (
        <section className="card">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Awaiting macro enrichment</h2>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Run the enrichment workflow from a Claude session (see the README) to fill these in.
          </p>
          {pending.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, paddingTop: 8 }}>All caught up. No pending meals.</p>
          ) : (
            pending.map((m) => <MealItem key={m.id} meal={m} />)
          )}
        </section>
      ) : groups.length === 0 ? (
        <p className="muted">No meals logged yet.</p>
      ) : (
        groups.map((g) => (
          <section className="card" key={g.date}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{prettyDate(g.date)}</h2>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
              {g.meals.length} {g.meals.length === 1 ? "entry" : "entries"} ·{" "}
              {Math.round(g.meals.reduce((s, m) => s + (m.kcal ?? 0), 0))} kcal logged
            </div>
            {g.meals.map((m) => (
              <MealItem key={m.id} meal={m} />
            ))}
          </section>
        ))
      )}
    </main>
  );
}
