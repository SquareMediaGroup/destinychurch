// The Supabase client — used for exactly two things, as in the phone app:
//   1. Auth (email one-time code, password).
//   2. Realtime: private Broadcast channels (src/lib/realtime.ts).
// Never for reading or writing Destiny One data: every table is deny-all and
// all data goes through the website's API (src/lib/api.ts).
//
// The session is kept in the macOS Keychain, not in the web view's storage.

import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { keychain } from "@/lib/native";

const keychainStorage: SupportedStorage = {
  getItem: (key) => keychain.get(key),
  setItem: (key, value) => keychain.set(key, value),
  removeItem: (key) => keychain.remove(key),
};

export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    storage: keychainStorage,
    storageKey: "d1admin.session",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
