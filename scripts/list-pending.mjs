#!/usr/bin/env node
// Lists every meal entry with no macros yet (id, date, slot, raw text).
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const { url, key } = loadEnv();
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await sb
  .from("meals")
  .select("id, eaten_at, slot, raw_text, kcal")
  .is("kcal", null)
  .order("eaten_at", { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}

if (!data.length) {
  console.log("No pending meals. 🎉");
  process.exit(0);
}

console.log(JSON.stringify(
  data.map((m) => ({ id: m.id, date: m.eaten_at, slot: m.slot, text: m.raw_text })),
  null,
  2
));
console.error(`\n${data.length} pending meal(s).`);
