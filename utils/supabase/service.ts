import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The service-role client (bypasses RLS) — the one implementation shared by
// every server-side caller, so there's a single place to change auth options
// or key handling instead of two clients drifting apart.
let client: SupabaseClient | null = null;

export function createServiceClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the new secret key (sb_secret_…); fall back to the legacy
  // service_role JWT during the transition. Both bypass RLS. Moving to a new
  // secret key also lets the leaked service_role key be revoked cleanly.
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY");
  }

  client = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return client;
}
