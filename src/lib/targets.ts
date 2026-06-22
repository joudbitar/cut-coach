// The owner's active program + profile. Seeded as the source of truth for
// dashboards and guidance copy.

export const PROFILE = {
  sex: "male" as const,
  age: 20,
  heightCm: 174,
  startWeightKg: 78,
  goalWeightKg: 73.5,
  ffmKg: 60, // 78kg @ 23% BF
  startBfPct: 23, // machine-measured (BIA), matches Navy tape calc
  tdeeEstimate: 2340, // Garmin 11-day avg total_kcal (not a guess)
};

export const TARGETS = {
  // Deeper cut: ~1%/wk loss. 2340 TDEE − ~790 deficit ≈ 0.95%/wk at current
  // ~4k steps; closer to 1.1%/wk if steps reach the 9500 target.
  kcal: 1550,
  protein: 185, // g — pushed up for the steeper deficit (muscle retention)
  fat: 55, // g (range 50-60, floor 50)
  fatFloor: 50,
  carb: 80, // g (range 70-90) — lower-carb to minimise water/bloat swings
  fiber: 30, // g (range 25-35)
  snackBudgetKcal: 200,
  steps: 9500, // 9000-10000 — the lever to eat more at the same deficit
  waterL: 3,
  foodFloorKcal: 1400,
};

export const MEAL_SLOTS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
