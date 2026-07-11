import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the new secret key (sb_secret_…); fall back to the legacy
  // service_role JWT during the transition. Both bypass RLS. Moving to a new
  // secret key also lets the leaked service_role key be revoked cleanly.
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY");
  }

  supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return supabase;
}

export function tryGetSupabaseAdmin(): SupabaseClient | null {
  try {
    return getSupabaseAdmin();
  } catch (error) {
    console.error("Supabase admin unavailable", error);
    return null;
  }
}
