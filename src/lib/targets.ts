// ── Make it yours ────────────────────────────────────────────────────────────
// Cut Coach is single-user. This file is the only thing you have to edit to make
// the app your own. Put your body stats and how hard you want to cut in PROFILE;
// the calorie target, the macros, and the deficit are all computed from it below.
// Nothing downstream needs touching.

export const PROFILE = {
  sex: "male" as "male" | "female",
  age: 25,
  heightCm: 178,
  startWeightKg: 82, // your weight the day the cut starts
  goalWeightKg: 75,

  // How hard to cut, as a fraction of bodyweight lost per week. 0.005 is gentle
  // (~0.5%), 0.01 is aggressive (~1%). 0.0075 is a sane default.
  weeklyLossRate: 0.0075,

  // Multiplier over BMR used only until Garmin data shows up: 1.2 desk-bound,
  // 1.375 lightly active, 1.55 moderate, 1.725 hard training. Once Garmin syncs,
  // real measured expenditure takes over.
  activityFactor: 1.45,
};

// Mifflin-St Jeor: the standard resting-burn estimate.
function bmr(): number {
  const base =
    10 * PROFILE.startWeightKg + 6.25 * PROFILE.heightCm - 5 * PROFILE.age;
  return Math.round(base + (PROFILE.sex === "male" ? 5 : -161));
}

// Maintenance calories before the cut.
export const TDEE = Math.round(bmr() * PROFILE.activityFactor);

// ~7700 kcal per kg of fat, so this is the daily deficit that lands the weekly
// loss target.
const dailyDeficit = Math.round(
  (PROFILE.weeklyLossRate * PROFILE.startWeightKg * 7700) / 7
);

const PROTEIN_PER_KG = 2.0; // g/kg bodyweight, muscle-retention range on a cut
const FAT_PER_KG = 0.8; // g/kg, hormone and satiety floor

const protein = Math.round(PROTEIN_PER_KG * PROFILE.startWeightKg);
const fat = Math.round(FAT_PER_KG * PROFILE.startWeightKg);
// Never program below BMR.
const kcal = Math.max(TDEE - dailyDeficit, bmr());
// Carbs are whatever calories are left after protein and fat, treated as a
// ceiling rather than a goal. Under is fine.
const carb = Math.floor(Math.max(kcal - protein * 4 - fat * 9, 0) / 4);

export const TARGETS = {
  kcal,
  protein,
  fat,
  fatFloor: Math.round(fat * 0.85),
  carb,
  carbIsCeiling: true,
  fiber: 30, // g, standard health target
  snackBudgetKcal: 200, // kcal held back for evening snacks
  steps: 9000,
  waterL: 3,
  foodFloorKcal: bmr(),
};

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
