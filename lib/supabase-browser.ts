import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // Prefer the new publishable key (sb_publishable_…); fall back to the legacy
  // anon JWT so nothing breaks until the legacy keys are disabled. Both map to
  // the public `anon` Postgres role, so RLS behaviour is identical. This also
  // makes the browser client consistent with utils/supabase/* which already
  // use the publishable key.
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !publicKey) {
    throw new Error("Missing Supabase project URL or publishable/anon key (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY).");
  }

  browserClient = createBrowserClient(url, publicKey);
  return browserClient;
}
