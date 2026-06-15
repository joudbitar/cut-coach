#!/usr/bin/env node
// Write macros back to a meal entry.
// Usage:
//   node scripts/enrich.mjs <id> <kcal> <protein> <fat> <carb> <fiber>
//   echo '[{"id":"...","kcal":330,"protein":52,"fat":9,"carb":6,"fiber":2}]' | node scripts/enrich.mjs --json
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const { url, key } = loadEnv();
const sb = createClient(url, key, { auth: { persistSession: false } });

async function update(row) {
  const patch = {
    kcal: num(row.kcal),
    protein: num(row.protein),
    fat: num(row.fat),
    carb: num(row.carb),
    fiber: num(row.fiber),
  };
  const { error } = await sb.from("meals").update(patch).eq("id", row.id);
  if (error) throw new Error(`${row.id}: ${error.message}`);
  console.log(`✓ ${row.id} → ${patch.kcal}kcal ${patch.protein}P ${patch.fat}F ${patch.carb}C ${patch.fiber}fib`);
}

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const args = process.argv.slice(2);
if (args[0] === "--json") {
  const input = await new Promise((res) => {
    let s = "";
    process.stdin.on("data", (c) => (s += c));
    process.stdin.on("end", () => res(s));
  });
  const rows = JSON.parse(input);
  for (const r of rows) await update(r);
} else if (args.length >= 6) {
  const [id, kcal, protein, fat, carb, fiber] = args;
  await update({ id, kcal, protein, fat, carb, fiber });
} else {
  console.error("Usage: node scripts/enrich.mjs <id> <kcal> <protein> <fat> <carb> <fiber>");
  console.error("   or: echo '[{...}]' | node scripts/enrich.mjs --json");
  process.exit(1);
}
