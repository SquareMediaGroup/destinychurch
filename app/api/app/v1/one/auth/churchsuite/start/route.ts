import { NextResponse } from "next/server";
import { createPkcePair, createState, isAllowedAppRedirect, seal } from "@/lib/destinyOne/churchsuite";
import { CHURCHSUITE_AUTHORIZE_URL, oauthClient } from "@/lib/destinyOne/churchsuite.server";
import { oneError } from "@/lib/destinyOne/http";
import {
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  STATE_TTL_SECONDS,
  callbackUrl,
  type OAuthState,
} from "@/lib/destinyOne/signin.server";

// GET /api/app/v1/one/auth/churchsuite/start?redirect=destinyone://auth&challenge=<S256>
//
// "Sign in with ChurchSuite", step 1. The app opens this in an auth session
// (expo-web-browser). We send the browser on to ChurchSuite's login with our
// own PKCE pair and a state value, both kept in a sealed, short-lived,
// HttpOnly cookie that the callback reads back.
//
// `challenge` is the APP's PKCE challenge — separate from ours with
// ChurchSuite. The callback hands the app a one-time code that is only
// redeemable with the matching verifier (see ../exchange), so another app that
// registers the destinyone:// scheme and intercepts the redirect gets nothing
// usable.
//
// ChurchSuite's OAuth identifies ChurchSuite *users* (staff/leaders with a
// ChurchSuite login). Members without one sign in with email instead.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") ?? "";
  const appChallenge = url.searchParams.get("challenge") ?? "";
  const secret = process.env.DESTINY_ONE_SECRET;
  const client = oauthClient();

  if (!secret || !client) {
    return oneError("unavailable", "Sign in with ChurchSuite isn't available right now. Please sign in with your email.");
  }
  if (!isAllowedAppRedirect(redirect, process.env.NODE_ENV !== "production")) {
    return oneError("invalid", "That return address isn't allowed.");
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(appChallenge)) {
    return oneError("invalid", "A PKCE challenge (S256, base64url) is required.");
  }

  const state = createState();
  const { verifier, challenge } = createPkcePair();

  const authorize = new URL(CHURCHSUITE_AUTHORIZE_URL);
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: client.id,
    redirect_uri: callbackUrl(),
    scope: "user",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const res = NextResponse.redirect(authorize.toString(), 302);
  const sealed: OAuthState = { state, verifier, redirect, appChallenge };
  res.cookies.set(STATE_COOKIE, seal(sealed, secret, STATE_TTL_SECONDS), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_TTL_SECONDS,
  });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
