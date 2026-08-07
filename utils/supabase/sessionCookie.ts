import type { CookieOptions } from "@supabase/ssr";

// Side cookie that records the admin's "keep me signed in" choice, so the
// middleware can keep re-applying it on every token refresh (Supabase's own
// cookie options force a 400-day maxAge on every refresh, which would
// silently turn a "don't remember me" session back into a persistent one).
export const REMEMBER_COOKIE_NAME = "sb-remember";

export function stripMaxAge(options: CookieOptions): CookieOptions {
  const { maxAge, expires, ...rest } = options;
  return rest;
}
