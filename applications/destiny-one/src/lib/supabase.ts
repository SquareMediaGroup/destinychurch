// Supabase clients — used for exactly two things:
//   1. Auth (email one-time code, and finishing Sign in with ChurchSuite).
//   2. Realtime: subscribing to private Broadcast channels (src/lib/realtime.ts).
//
// They are NOT used to read or write Destiny One data. Every table is
// deny-all; all data goes through the BFF (src/lib/api.ts), which is where the
// safeguarding rules are applied.
//
// There is one client per signed-in account (src/lib/accounts.ts), each with
// its own saved session, so switching accounts never has to hand tokens
// between clients or sign anyone out.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { secureStorage } from "@/lib/secureStorage";

/** `storageKey` undefined = Supabase's default key, where single-account builds kept the session. */
export function makeClient(storageKey?: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      storage: secureStorage,
      // Only when set: an explicit `undefined` would replace supabase-js's default key.
      ...(storageKey ? { storageKey } : {}),
      autoRefreshToken: false, // only the active account refreshes (accounts.ts)
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
