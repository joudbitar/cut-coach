// The owner's active program + profile. Seeded as the source of truth for
// dashboards and guidance copy.

export const PROFILE = {
  sex: "male" as const,
  age: 20,
  heightCm: 174,
  startWeightKg: 78,
  goalWeightKg: 73.5,
  ffmKg: 65,
  startBfPct: 16.5,
  tdeeEstimate: 2400,
};

export const TARGETS = {
  kcal: 1800,
  protein: 180, // g
  fat: 60, // g (range 55-65, floor 50)
  fatFloor: 50,
  carb: 138, // g (range 130-145)
  fiber: 30, // g (range 25-35)
  snackBudgetKcal: 350, // ~300-400 earmarked
  steps: 9500, // 9000-10000
  waterL: 3,
  foodFloorKcal: 1700,
};

export const MEAL_SLOTS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
