// The Supabase client — used for exactly two things:
//   1. Auth (email one-time code, and finishing Sign in with ChurchSuite).
//   2. Realtime: subscribing to private Broadcast channels (src/lib/realtime.ts).
//
// It is NOT used to read or write Destiny One data. Every table is deny-all;
// all data goes through the BFF (src/lib/api.ts), which is where the
// safeguarding rules are applied.

import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { secureStorage } from "@/lib/secureStorage";

export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
