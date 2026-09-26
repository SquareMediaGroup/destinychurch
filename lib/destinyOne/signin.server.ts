// Destiny One — shared bits of the "Sign in with ChurchSuite" hand-off
// (app/api/app/v1/one/auth/churchsuite/{start,callback,exchange}). Route files
// may only export handlers, so these live here.

import "server-only";
import { SITE_ORIGIN } from "@/lib/appApi";

/** Sealed {state, verifier, redirect, appChallenge}, set by start, read by callback. */
export const STATE_COOKIE = "d1_cs_oauth";
export const STATE_COOKIE_PATH = "/api/app/v1/one/auth/churchsuite";
export const STATE_TTL_SECONDS = 10 * 60;

/** How long the one-time code handed back to the app stays redeemable. */
export const HANDOFF_TTL_SECONDS = 2 * 60;

export function callbackUrl(): string {
  return `${SITE_ORIGIN}/api/app/v1/one/auth/churchsuite/callback`;
}

export interface OAuthState extends Record<string, unknown> {
  state: string;
  verifier: string;
  redirect: string;
  appChallenge: string;
}

export interface Handoff extends Record<string, unknown> {
  tokenHash: string;
  appChallenge: string;
}
