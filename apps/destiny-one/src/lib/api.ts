// The Destiny One API client, from the shared package — the same types the
// server produces, so the app can't drift from the BFF without a type error.

import { createDestinyOneClient } from "@destiny/shared";
import { config } from "@/lib/config";
import { accessToken, signInClient } from "@/lib/accounts";

/** Calls as the active account. */
export const api = createDestinyOneClient({
  baseUrl: config.apiBaseUrl,
  getAccessToken: accessToken,
});

/**
 * Calls as whoever is signing in — during "Add account" that's the new
 * account, while `api` (and everything on screen) is still the current one.
 */
export const signInApi = createDestinyOneClient({
  baseUrl: config.apiBaseUrl,
  getAccessToken: async () => (await signInClient().auth.getSession()).data.session?.access_token ?? null,
});

export { D1ApiError } from "@destiny/shared";
