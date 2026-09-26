// The Destiny One API client, from the shared package — the same types the
// server produces, so the app can't drift from the BFF without a type error.

import { createDestinyOneClient } from "@destiny/shared";
import { config } from "@/lib/config";
import { accessToken } from "@/lib/supabase";

export const api = createDestinyOneClient({
  baseUrl: config.apiBaseUrl,
  getAccessToken: accessToken,
});

export { D1ApiError } from "@destiny/shared";
