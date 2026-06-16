import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only admin client. Uses the service role key so all access happens
// server-side behind the PIN gate. NEVER import this into a client component.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let _client: SupabaseClient | null = null;

export function db() {
  if (!url || !serviceKey) {
    throw new Error("Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  if (!_client) {
    _client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export const PHOTO_BUCKET = "photos";
