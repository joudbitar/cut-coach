import "server-only";
import { db, PHOTO_BUCKET } from "./supabase";
import { localDateStr } from "./dates";

// Inclusive ISO date (YYYY-MM-DD) N days before today, owner-local.
function windowStartDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return localDateStr(d);
}

// Finite number > 0, else null. Kills the -1/0 "no data" sentinels Garmin
// emits for HR/HRV/scores/stress and kcal totals.
function posOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Finite number including 0, else null. For steps/floors/active_kcal where 0
// is a legitimate value.
function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

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

// --- Garmin recovery + expenditure -----------------------------------------

// One row per day. avg_hr is omitted: it is 100% NULL in the live data. HR/HRV/
// score/stress/kcal-total fields run through posOrNull to strip the -1/0
// sentinels; steps/floors/active_kcal keep 0 via numOrNull.
export type GarminDaily = {
  day: string;
  resting_hr: number | null;
  max_hr: number | null;
  hrv_ms: number | null;
  body_battery_high: number | null;
  body_battery_low: number | null;
  stress_avg: number | null;
  sleep_score: number | null;
  sleep_seconds: number | null;
  steps: number | null;
  floors: number | null;
  active_kcal: number | null;
  total_kcal: number | null;
  bmr_kcal: number | null;
};

export async function getGarminDaily(days = 30): Promise<GarminDaily[]> {
  const { data } = await db()
    .from("garmin_daily")
    .select(
      "day, resting_hr, max_hr, hrv_ms, body_battery_high, body_battery_low, stress_avg, sleep_score, sleep_seconds, steps, floors, active_kcal, total_kcal, bmr_kcal"
    )
    .gte("day", windowStartDate(days))
    .order("day", { ascending: true });
  return (data ?? []).map((r) => ({
    day: r.day,
    resting_hr: posOrNull(r.resting_hr),
    max_hr: posOrNull(r.max_hr),
    hrv_ms: posOrNull(r.hrv_ms),
    body_battery_high: posOrNull(r.body_battery_high),
    body_battery_low: posOrNull(r.body_battery_low),
    stress_avg: posOrNull(r.stress_avg),
    sleep_score: posOrNull(r.sleep_score),
    sleep_seconds: posOrNull(r.sleep_seconds),
    steps: numOrNull(r.steps),
    floors: numOrNull(r.floors),
    active_kcal: numOrNull(r.active_kcal),
    total_kcal: posOrNull(r.total_kcal),
    bmr_kcal: posOrNull(r.bmr_kcal),
  }));
}

export type GarminActivity = {
  id: string;
  started_at: string;
  type: string | null;
  name: string | null;
  duration_s: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  kcal: number | null;
};

export async function getGarminActivities(days = 30): Promise<GarminActivity[]> {
  const since = new Date(windowStartDate(days) + "T00:00:00Z").toISOString();
  const { data } = await db()
    .from("garmin_activities")
    .select("id, started_at, type, name, duration_s, distance_m, avg_hr, max_hr, kcal")
    .gte("started_at", since)
    .order("started_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id,
    started_at: r.started_at,
    type: r.type ?? null,
    name: r.name ?? null,
    duration_s: numOrNull(r.duration_s),
    distance_m: numOrNull(r.distance_m),
    avg_hr: posOrNull(r.avg_hr),
    max_hr: posOrNull(r.max_hr),
    kcal: numOrNull(r.kcal),
  }));
}

// --- Nutrition aggregation --------------------------------------------------

export type DailyMacros = {
  date: string;
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
  fiber: number;
  pendingCount: number;
};

export async function getDailyMacros(days = 30): Promise<DailyMacros[]> {
  const start = windowStartDate(days);
  // Pad two extra UTC days so owner-local bucketing near the window edge is safe.
  const since = new Date(start + "T00:00:00Z");
  since.setUTCDate(since.getUTCDate() - 2);
  const { data } = await db()
    .from("meals")
    .select("eaten_at, kcal, protein, fat, carb, fiber")
    .gte("eaten_at", since.toISOString())
    .order("eaten_at", { ascending: true });

  const buckets = new Map<string, DailyMacros>();
  for (const m of data ?? []) {
    const date = localDateStr(new Date(m.eaten_at));
    let agg = buckets.get(date);
    if (!agg) {
      agg = { date, kcal: 0, protein: 0, fat: 0, carb: 0, fiber: 0, pendingCount: 0 };
      buckets.set(date, agg);
    }
    if (m.kcal == null) {
      // Unparsed meal: count as pending, don't sum its (absent) macros.
      agg.pendingCount += 1;
      continue;
    }
    agg.kcal += Number(m.kcal);
    agg.protein += Number(m.protein ?? 0);
    agg.fat += Number(m.fat ?? 0);
    agg.carb += Number(m.carb ?? 0);
    agg.fiber += Number(m.fiber ?? 0);
  }

  return Array.from(buckets.values())
    .filter((b) => b.date >= start)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// --- Training volume + strength progression ---------------------------------

export type SessionVolume = {
  sessionId: string;
  date: string;
  dayName: string | null;
  totalVolumeKg: number;
  setCount: number;
  avgRpe: number | null;
};

export async function getSessionVolumes(days = 90): Promise<SessionVolume[]> {
  const since = new Date(windowStartDate(days) + "T00:00:00Z").toISOString();
  const { data: sessions } = await db()
    .from("workout_sessions")
    .select("id, day_name, started_at")
    .gte("started_at", since)
    .order("started_at", { ascending: true });
  if (!sessions || sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: setRows } = await db()
    .from("set_logs")
    .select("session_id, weight_kg, reps, rpe")
    .in("session_id", ids);

  type Agg = { totalVolumeKg: number; setCount: number; rpeSum: number; rpeN: number };
  const aggs = new Map<string, Agg>();
  for (const r of setRows ?? []) {
    let a = aggs.get(r.session_id);
    if (!a) {
      a = { totalVolumeKg: 0, setCount: 0, rpeSum: 0, rpeN: 0 };
      aggs.set(r.session_id, a);
    }
    a.setCount += 1;
    const w = r.weight_kg == null ? null : Number(r.weight_kg);
    const reps = r.reps == null ? null : Number(r.reps);
    if (w != null && reps != null) a.totalVolumeKg += w * reps;
    if (r.rpe != null) {
      a.rpeSum += Number(r.rpe);
      a.rpeN += 1;
    }
  }

  return sessions.map((s) => {
    const a = aggs.get(s.id);
    return {
      sessionId: s.id,
      date: localDateStr(new Date(s.started_at)),
      dayName: s.day_name ?? null,
      totalVolumeKg: a ? Math.round(a.totalVolumeKg * 10) / 10 : 0,
      setCount: a ? a.setCount : 0,
      avgRpe: a && a.rpeN ? Math.round((a.rpeSum / a.rpeN) * 10) / 10 : null,
    };
  });
}

export type Est1RMPoint = { date: string; est1rm: number };

export async function getEst1RMSeries(
  exerciseId: string,
  days = 90
): Promise<Est1RMPoint[]> {
  const since = new Date(windowStartDate(days) + "T00:00:00Z").toISOString();
  const { data: sessions } = await db()
    .from("workout_sessions")
    .select("id, started_at")
    .gte("started_at", since)
    .order("started_at", { ascending: true });
  if (!sessions || sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: setRows } = await db()
    .from("set_logs")
    .select("session_id, weight_kg, reps")
    .eq("exercise_id", exerciseId)
    .in("session_id", ids);
  if (!setRows || setRows.length === 0) return [];

  // Best Epley estimate per session.
  const best = new Map<string, number>();
  for (const r of setRows) {
    const w = r.weight_kg == null ? null : Number(r.weight_kg);
    const reps = r.reps == null ? null : Number(r.reps);
    if (w == null || reps == null || w <= 0 || reps <= 0) continue;
    const est = w * (1 + reps / 30); // Epley
    const cur = best.get(r.session_id);
    if (cur == null || est > cur) best.set(r.session_id, est);
  }

  const points: Est1RMPoint[] = [];
  for (const s of sessions) {
    const est = best.get(s.id);
    if (est == null) continue;
    points.push({
      date: localDateStr(new Date(s.started_at)),
      est1rm: Math.round(est * 10) / 10,
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// --- Day alignment ----------------------------------------------------------

export type DayRow = {
  date: string;
  kcal: number | null;
  protein: number | null;
  weightKg: number | null;
  weightAvg: number | null;
  restingHr: number | null;
  hrvMs: number | null;
  sleepScore: number | null;
  sleepHours: number | null;
  steps: number | null;
  stressAvg: number | null;
  bodyBatteryHigh: number | null;
  bodyBatteryLow: number | null;
  activeKcal: number | null;
  totalKcal: number | null;
  bmrKcal: number | null;
  energyBalance: number | null; // kcal_in - total_kcal_out, null unless BOTH present
};

// Contiguous YYYY-MM-DD list, oldest -> today (owner-local), length `days`.
export function buildDaySpine(days: number): string[] {
  const spine: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    spine.push(localDateStr(d));
  }
  return spine;
}

// Index each source by date and emit a gap-aware DayRow per spine date. Never
// interpolates or carries values forward — missing data stays null.
export function alignDays(
  spine: string[],
  src: {
    garminDaily: GarminDaily[];
    dailyMacros: DailyMacros[];
    trend: import("./trend").TrendPoint[]; // {date, weight, avg}
  }
): DayRow[] {
  const garminByDate = new Map(src.garminDaily.map((g) => [g.day, g]));
  const macrosByDate = new Map(src.dailyMacros.map((m) => [m.date, m]));
  const trendByDate = new Map(src.trend.map((t) => [t.date, t]));

  return spine.map((date) => {
    const g = garminByDate.get(date) ?? null;
    const m = macrosByDate.get(date) ?? null;
    const t = trendByDate.get(date) ?? null;

    const kcal = m ? m.kcal : null;
    const totalKcal = g ? g.total_kcal : null;
    const sleepSeconds = g ? g.sleep_seconds : null;

    return {
      date,
      kcal,
      protein: m ? m.protein : null,
      weightKg: t ? t.weight : null,
      weightAvg: t ? t.avg : null,
      restingHr: g ? g.resting_hr : null,
      hrvMs: g ? g.hrv_ms : null,
      sleepScore: g ? g.sleep_score : null,
      sleepHours:
        sleepSeconds == null ? null : Math.round((sleepSeconds / 3600) * 10) / 10,
      steps: g ? g.steps : null,
      stressAvg: g ? g.stress_avg : null,
      bodyBatteryHigh: g ? g.body_battery_high : null,
      bodyBatteryLow: g ? g.body_battery_low : null,
      activeKcal: g ? g.active_kcal : null,
      totalKcal,
      bmrKcal: g ? g.bmr_kcal : null,
      energyBalance: kcal != null && totalKcal != null ? kcal - totalKcal : null,
    };
  });
}
