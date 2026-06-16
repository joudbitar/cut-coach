import "server-only";
import { db, PHOTO_BUCKET } from "./supabase";
import { localDateStr } from "./dates";

export type Meal = {
  id: string;
  eaten_at: string;
  slot: string;
  raw_text: string;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carb: number | null;
  fiber: number | null;
};

export type Weight = { id: string; measured_on: string; weight_kg: number };
export type Measurement = {
  id: string;
  measured_on: string;
  waist_cm: number;
  neck_cm: number;
  bf_pct: number | null;
};
export type Photo = { id: string; taken_on: string; storage_path: string; url?: string };
export type Exercise = {
  id: string;
  name: string;
  muscle: string;
  target_sets: number;
  target_reps: string;
  ord: number;
};
export type ProgramDay = { id: string; key: string; name: string; ord: number; exercises: Exercise[] };

export async function getMealsForLocalDate(dateStr: string): Promise<Meal[]> {
  // Pull a window and filter to the owner-local day.
  const since = new Date(dateStr + "T00:00:00Z");
  since.setUTCDate(since.getUTCDate() - 2);
  const { data } = await db()
    .from("meals")
    .select("*")
    .gte("eaten_at", since.toISOString())
    .order("eaten_at", { ascending: true });
  return (data ?? []).filter((m) => localDateStr(new Date(m.eaten_at)) === dateStr);
}

export async function getMealsGroupedByDay(): Promise<{ date: string; meals: Meal[] }[]> {
  const { data } = await db()
    .from("meals")
    .select("*")
    .order("eaten_at", { ascending: false })
    .limit(300);
  const groups = new Map<string, Meal[]>();
  for (const m of data ?? []) {
    const d = localDateStr(new Date(m.eaten_at));
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d)!.push(m);
  }
  return Array.from(groups.entries()).map(([date, meals]) => ({ date, meals }));
}

export async function getPendingMeals(): Promise<Meal[]> {
  const { data } = await db()
    .from("meals")
    .select("*")
    .is("kcal", null)
    .order("eaten_at", { ascending: false });
  return data ?? [];
}

export async function getWeights(): Promise<Weight[]> {
  const { data } = await db()
    .from("weights")
    .select("*")
    .order("measured_on", { ascending: true });
  return (data ?? []).map((w) => ({ ...w, weight_kg: Number(w.weight_kg) }));
}

export async function getMeasurements(): Promise<Measurement[]> {
  const { data } = await db()
    .from("measurements")
    .select("*")
    .order("measured_on", { ascending: true });
  return (data ?? []).map((m) => ({
    ...m,
    waist_cm: Number(m.waist_cm),
    neck_cm: Number(m.neck_cm),
    bf_pct: m.bf_pct == null ? null : Number(m.bf_pct),
  }));
}

export async function getPhotos(): Promise<Photo[]> {
  const { data } = await db()
    .from("photos")
    .select("id, taken_on, storage_path")
    .order("taken_on", { ascending: false });
  const photos = data ?? [];
  const client = db();
  return Promise.all(
    photos.map(async (p) => {
      const { data: signed } = await client.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(p.storage_path, 60 * 60);
      return { ...p, url: signed?.signedUrl };
    })
  );
}

export async function getProgram(): Promise<ProgramDay[]> {
  const { data } = await db()
    .from("program_days")
    .select("*, exercises(*)")
    .order("ord", { ascending: true });
  return (data ?? []).map((d: any) => ({
    id: d.id,
    key: d.key,
    name: d.name,
    ord: d.ord,
    exercises: (d.exercises ?? []).slice().sort((a: Exercise, b: Exercise) => a.ord - b.ord),
  }));
}

export async function getProgramDay(key: string): Promise<ProgramDay | null> {
  const { data: day } = await db().from("program_days").select("*").eq("key", key).single();
  if (!day) return null;
  const { data: exercises } = await db()
    .from("exercises")
    .select("*")
    .eq("day_id", day.id)
    .order("ord", { ascending: true });
  return { ...day, exercises: exercises ?? [] };
}

// Last-session top-set summary for the overload cue. Excludes the current
// session so the cue reflects the *previous* time this lift was trained.
export async function getLastSetSummary(
  exerciseId: string,
  excludeSessionId?: string
): Promise<{ topWeight: number | null; topReps: number | null; avgRpe: number | null } | null> {
  const { data: all } = await db()
    .from("set_logs")
    .select("session_id, weight_kg, reps, rpe, created_at")
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false })
    .limit(60);
  const sessions = (all ?? []).filter((s) => s.session_id !== excludeSessionId);
  if (sessions.length === 0) return null;
  const latestSession = sessions[0].session_id;
  const rows = sessions.filter((s) => s.session_id === latestSession);
  let topWeight: number | null = null;
  let topReps: number | null = null;
  let rpeSum = 0;
  let rpeN = 0;
  for (const r of rows) {
    const w = r.weight_kg == null ? null : Number(r.weight_kg);
    if (w != null && (topWeight == null || w > topWeight)) {
      topWeight = w;
      topReps = r.reps == null ? null : Number(r.reps);
    }
    if (r.rpe != null) {
      rpeSum += Number(r.rpe);
      rpeN++;
    }
  }
  return {
    topWeight,
    topReps,
    avgRpe: rpeN ? Math.round((rpeSum / rpeN) * 10) / 10 : null,
  };
}

export type WorkoutHistoryRow = {
  id: string;
  day_name: string | null;
  started_at: string;
  finished_at: string | null;
  setCount: number;
};

export async function getWorkoutHistory(): Promise<WorkoutHistoryRow[]> {
  const { data: sessions } = await db()
    .from("workout_sessions")
    .select("id, day_name, started_at, finished_at")
    .order("started_at", { ascending: false })
    .limit(50);
  const ids = (sessions ?? []).map((s) => s.id);
  const { data: setRows } = ids.length
    ? await db().from("set_logs").select("session_id").in("session_id", ids)
    : { data: [] as { session_id: string }[] };
  const counts = new Map<string, number>();
  for (const r of setRows ?? []) counts.set(r.session_id, (counts.get(r.session_id) ?? 0) + 1);
  return (sessions ?? []).map((s) => ({ ...s, setCount: counts.get(s.id) ?? 0 }));
}

export async function getSessionDetail(id: string) {
  const { data: session } = await db()
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .single();
  const { data: sets } = await db()
    .from("set_logs")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });
  return { session, sets: sets ?? [] };
}
