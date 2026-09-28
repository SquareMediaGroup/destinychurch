// The Destiny One API client, from the shared package — the same types the
// server produces, so the app can't drift from the BFF without a type error.
//
// Every call is watched for the errors that mean "your account changed while
// the app was open" (suspended, no longer verified, new notices to accept).
// Those tell the session to re-check `me`, which moves the person to the right
// screen (src/state/session.tsx, AccessGuard) instead of leaving them on a
// chat screen whose every action fails.

import { createDestinyOneClient, D1ApiError } from "@destiny/shared";
import { config } from "@/lib/config";
import { accessToken } from "@/lib/supabase";

const ACCESS_CODES = new Set(["forbidden", "not_verified", "access_request_needed", "consent_required"]);

let onAccessChanged: (() => void) | null = null;
/** The session registers here to hear about account changes mid-session. */
export function setAccessChangedHandler(fn: (() => void) | null) {
  onAccessChanged = fn;
}

const client = createDestinyOneClient({
  baseUrl: config.apiBaseUrl,
  getAccessToken: accessToken,
});

function watch<T>(value: T): T {
  if (value instanceof Promise) {
    value.catch((err: unknown) => {
      if (err instanceof D1ApiError && ACCESS_CODES.has(err.code)) onAccessChanged?.();
    });
  }
  return value;
}

export const api = new Proxy(client, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value !== "function") return value;
    return (...args: unknown[]) => watch((value as (...a: unknown[]) => unknown).apply(target, args));
  },
}) as typeof client;

export { D1ApiError };
