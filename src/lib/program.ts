// 4-day Upper/Lower retention split. Cut context: hold loads, ~10-12 hard
// sets/muscle/week, each muscle ~2x/week. Used both to seed the DB and as the
// canonical reference in the UI.

export type SeedExercise = {
  name: string;
  muscle: string;
  targetSets: number;
  targetReps: string;
  order: number;
};

export type SeedDay = {
  key: string; // stable identifier
  name: string;
  order: number;
  exercises: SeedExercise[];
};

export const PROGRAM: SeedDay[] = [
  {
    key: "upper-a",
    name: "Upper A",
    order: 1,
    exercises: [
      { name: "Barbell Bench Press", muscle: "Chest", targetSets: 3, targetReps: "6-8", order: 1 },
      { name: "Barbell Row", muscle: "Back", targetSets: 3, targetReps: "8-10", order: 2 },
      { name: "Seated DB Shoulder Press", muscle: "Shoulders", targetSets: 3, targetReps: "8-12", order: 3 },
      { name: "Lat Pulldown", muscle: "Back", targetSets: 3, targetReps: "10-12", order: 4 },
      { name: "Incline DB Press", muscle: "Chest", targetSets: 2, targetReps: "10-12", order: 5 },
      { name: "Cable Face Pull", muscle: "Rear Delts", targetSets: 3, targetReps: "12-15", order: 6 },
      { name: "Triceps Pushdown", muscle: "Triceps", targetSets: 3, targetReps: "10-12", order: 7 },
      { name: "Barbell Curl", muscle: "Biceps", targetSets: 3, targetReps: "10-12", order: 8 },
    ],
  },
  {
    key: "lower-a",
    name: "Lower A",
    order: 2,
    exercises: [
      { name: "Back Squat", muscle: "Quads", targetSets: 3, targetReps: "5-8", order: 1 },
      { name: "Romanian Deadlift", muscle: "Hamstrings", targetSets: 3, targetReps: "8-10", order: 2 },
      { name: "Leg Press", muscle: "Quads", targetSets: 3, targetReps: "10-12", order: 3 },
      { name: "Seated Leg Curl", muscle: "Hamstrings", targetSets: 3, targetReps: "10-12", order: 4 },
      { name: "Standing Calf Raise", muscle: "Calves", targetSets: 4, targetReps: "10-15", order: 5 },
      { name: "Hanging Leg Raise", muscle: "Abs", targetSets: 3, targetReps: "10-15", order: 6 },
    ],
  },
  {
    key: "upper-b",
    name: "Upper B",
    order: 3,
    exercises: [
      { name: "Incline Barbell Press", muscle: "Chest", targetSets: 3, targetReps: "6-8", order: 1 },
      { name: "Weighted Pull-up", muscle: "Back", targetSets: 3, targetReps: "6-10", order: 2 },
      { name: "Overhead Press", muscle: "Shoulders", targetSets: 3, targetReps: "6-8", order: 3 },
      { name: "Chest-Supported Row", muscle: "Back", targetSets: 3, targetReps: "10-12", order: 4 },
      { name: "Cable Fly", muscle: "Chest", targetSets: 2, targetReps: "12-15", order: 5 },
      { name: "Lateral Raise", muscle: "Shoulders", targetSets: 3, targetReps: "12-15", order: 6 },
      { name: "Hammer Curl", muscle: "Biceps", targetSets: 3, targetReps: "10-12", order: 7 },
      { name: "Overhead Triceps Extension", muscle: "Triceps", targetSets: 3, targetReps: "10-12", order: 8 },
    ],
  },
  {
    key: "lower-b",
    name: "Lower B",
    order: 4,
    exercises: [
      { name: "Deadlift", muscle: "Hamstrings", targetSets: 3, targetReps: "4-6", order: 1 },
      { name: "Bulgarian Split Squat", muscle: "Quads", targetSets: 3, targetReps: "8-10", order: 2 },
      { name: "Leg Extension", muscle: "Quads", targetSets: 3, targetReps: "12-15", order: 3 },
      { name: "Lying Leg Curl", muscle: "Hamstrings", targetSets: 3, targetReps: "10-12", order: 4 },
      { name: "Seated Calf Raise", muscle: "Calves", targetSets: 4, targetReps: "12-15", order: 5 },
      { name: "Cable Crunch", muscle: "Abs", targetSets: 3, targetReps: "12-15", order: 6 },
    ],
  },
];

// Progressive-overload cue based on the last logged session for an exercise.
// On a cut the default is MAINTAIN. Suggest tiny progression only if last
// session was easy (RPE <= 7) and hit/beat the top of the rep range.
export function overloadCue(last: {
  topWeight: number | null;
  topReps: number | null;
  avgRpe: number | null;
} | null, targetReps: string): { tone: "hold" | "up" | "flag"; text: string } {
  if (!last || last.topWeight == null) {
    return { tone: "hold", text: "First time — pick a load you can keep for all sets at RPE 7-8." };
  }
  const repCeil = parseInt(targetReps.split("-").pop() || "0", 10);
  if (last.avgRpe != null && last.avgRpe <= 7 && last.topReps != null && repCeil > 0 && last.topReps >= repCeil) {
    return {
      tone: "up",
      text: `Last set felt easy (RPE ${last.avgRpe}). You may add a small step (+2.5kg or +1 rep).`,
    };
  }
  if (last.avgRpe != null && last.avgRpe >= 9) {
    return {
      tone: "flag",
      text: `Last session was RPE ${last.avgRpe} — under-recovery on a cut. Hold or shave a rep; don't chase it.`,
    };
  }
  return {
    tone: "hold",
    text: `Maintain: aim to match last time (${last.topWeight}kg × ${last.topReps ?? "?"}). Retention, not PRs.`,
  };
}
