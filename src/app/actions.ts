"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, PHOTO_BUCKET } from "@/lib/supabase";
import { SESSION_COOKIE, checkPin, expectedToken } from "@/lib/auth";
import { navyBodyFatMale } from "@/lib/bf";
import { PROFILE } from "@/lib/targets";
import { localDateStr } from "@/lib/dates";

// ---------- auth ----------
export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  const next = String(formData.get("next") ?? "/today") || "/today";
  if (!(await checkPin(pin))) {
    return { error: "Wrong PIN" };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await expectedToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  redirect(next.startsWith("/") ? next : "/today");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------- nutrition ----------
export async function addMeal(formData: FormData) {
  const raw = String(formData.get("raw_text") ?? "").trim();
  const slot = String(formData.get("slot") ?? "snack");
  if (!raw) return;
  await db().from("meals").insert({ raw_text: raw, slot });
  revalidatePath("/today");
  revalidatePath("/nutrition");
}

export async function updateMeal(formData: FormData) {
  const id = String(formData.get("id"));
  const raw = String(formData.get("raw_text") ?? "").trim();
  const num = (k: string) => {
    const v = formData.get(k);
    if (v == null || String(v).trim() === "") return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  };
  await db()
    .from("meals")
    .update({
      raw_text: raw,
      kcal: num("kcal"),
      protein: num("protein"),
      fat: num("fat"),
      carb: num("carb"),
      fiber: num("fiber"),
    })
    .eq("id", id);
  revalidatePath("/today");
  revalidatePath("/nutrition");
}

export async function deleteMeal(formData: FormData) {
  const id = String(formData.get("id"));
  await db().from("meals").delete().eq("id", id);
  revalidatePath("/today");
  revalidatePath("/nutrition");
}

// ---------- progress ----------
export async function addWeight(formData: FormData) {
  const weight = Number(formData.get("weight_kg"));
  const date = String(formData.get("measured_on") || localDateStr());
  if (!isFinite(weight) || weight <= 0) return;
  await db().from("weights").upsert({ measured_on: date, weight_kg: weight }, { onConflict: "measured_on" });
  revalidatePath("/progress");
}

export async function addMeasurement(formData: FormData) {
  const waist = Number(formData.get("waist_cm"));
  const neck = Number(formData.get("neck_cm"));
  const date = String(formData.get("measured_on") || localDateStr());
  if (!isFinite(waist) || !isFinite(neck)) return;
  const bf = navyBodyFatMale(waist, neck, PROFILE.heightCm);
  await db().from("measurements").insert({ measured_on: date, waist_cm: waist, neck_cm: neck, bf_pct: bf });
  revalidatePath("/progress");
}

export async function addPhoto(formData: FormData) {
  const file = formData.get("photo");
  const date = String(formData.get("taken_on") || localDateStr());
  if (!(file instanceof File) || file.size === 0) return;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${date}/${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await db().storage.from(PHOTO_BUCKET).upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  await db().from("photos").insert({ taken_on: date, storage_path: path });
  revalidatePath("/progress");
}

// ---------- training ----------
export async function startWorkout(formData: FormData) {
  const dayKey = String(formData.get("day_key"));
  const { data: day } = await db().from("program_days").select("*").eq("key", dayKey).single();
  if (!day) redirect("/training");
  const { data: session } = await db()
    .from("workout_sessions")
    .insert({ day_id: day!.id, day_key: day!.key, day_name: day!.name })
    .select("id")
    .single();
  redirect(`/training/session/${session!.id}`);
}

export async function logSet(formData: FormData) {
  const sessionId = String(formData.get("session_id"));
  const exerciseId = String(formData.get("exercise_id"));
  const exerciseName = String(formData.get("exercise_name"));
  const setNumber = Number(formData.get("set_number"));
  const num = (k: string) => {
    const v = formData.get(k);
    if (v == null || String(v).trim() === "") return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  };
  await db().from("set_logs").insert({
    session_id: sessionId,
    exercise_id: exerciseId,
    exercise_name: exerciseName,
    set_number: setNumber,
    weight_kg: num("weight_kg"),
    reps: num("reps"),
    rpe: num("rpe"),
  });
  revalidatePath(`/training/session/${sessionId}`);
}

export async function deleteSet(formData: FormData) {
  const id = String(formData.get("id"));
  const sessionId = String(formData.get("session_id"));
  await db().from("set_logs").delete().eq("id", id);
  revalidatePath(`/training/session/${sessionId}`);
}

export async function finishWorkout(formData: FormData) {
  const sessionId = String(formData.get("session_id"));
  await db().from("workout_sessions").update({ finished_at: new Date().toISOString() }).eq("id", sessionId);
  revalidatePath("/training");
  redirect("/training");
}
