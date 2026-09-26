import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { seal, unseal } from "@/lib/destinyOne/churchsuite";
import { exchangeAuthCode, getCurrentUser } from "@/lib/destinyOne/churchsuite.server";
import { linkMember } from "@/lib/destinyOne/identity.server";
import { oneError } from "@/lib/destinyOne/http";
import {
  HANDOFF_TTL_SECONDS,
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  callbackUrl,
  type Handoff,
  type OAuthState,
} from "@/lib/destinyOne/signin.server";

// GET /api/app/v1/one/auth/churchsuite/callback?code=…&state=…
//
// "Sign in with ChurchSuite", step 2. ChurchSuite sends the browser back here.
// We swap the code for a token (with our PKCE verifier), ask ChurchSuite who
// signed in, make sure a Supabase user exists for that email, link it to the
// ChurchSuite contact, and mint a one-time Supabase sign-in token.
//
// That token is NOT put in the redirect. The app gets a sealed, 2-minute code
// instead, which it redeems at ../exchange with its own PKCE verifier.

export const dynamic = "force-dynamic";

function back(redirect: string, params: Record<string, string>): NextResponse {
  const res = NextResponse.redirect(`${redirect}?${new URLSearchParams(params)}`, 302);
  res.cookies.set(STATE_COOKIE, "", { path: STATE_COOKIE_PATH, maxAge: 0 });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export async function GET(request: Request) {
  const secret = process.env.DESTINY_ONE_SECRET;
  if (!secret) return oneError("unavailable", "Sign in with ChurchSuite isn't available right now.");

  const jar = await cookies();
  const saved = unseal<OAuthState>(jar.get(STATE_COOKIE)?.value ?? "", secret);
  if (!saved) {
    return oneError("invalid", "This sign-in link has expired. Please go back to the app and try again.");
  }

  const url = new URL(request.url);
  if (url.searchParams.get("state") !== saved.state) {
    return back(saved.redirect, { error: "state_mismatch" });
  }
  if (url.searchParams.get("error")) {
    return back(saved.redirect, { error: "cancelled" });
  }
  const code = url.searchParams.get("code");
  if (!code) return back(saved.redirect, { error: "no_code" });

  try {
    const token = await exchangeAuthCode({ code, verifier: saved.verifier, redirectUri: callbackUrl() });
    const csUser = await getCurrentUser(token);
    if (!csUser?.email) return back(saved.redirect, { error: "no_email" });

    const supabase = createServiceClient();

    // Make sure the account exists. ChurchSuite has vouched for the address,
    // so it is created confirmed. "Already registered" is the common case.
    const created = await supabase.auth.admin.createUser({ email: csUser.email, email_confirm: true });
    if (created.error && !/already|registered|exists/i.test(created.error.message)) {
      throw created.error;
    }

    const link = await supabase.auth.admin.generateLink({ type: "magiclink", email: csUser.email });
    if (link.error || !link.data.properties?.hashed_token || !link.data.user) {
      throw link.error ?? new Error("No sign-in token generated");
    }

    await linkMember(
      { id: link.data.user.id, email: csUser.email, phone: link.data.user.phone || null },
      { churchsuiteUserId: csUser.userId, contactId: csUser.contactId },
    );

    const handoff: Handoff = { tokenHash: link.data.properties.hashed_token, appChallenge: saved.appChallenge };
    return back(saved.redirect, { code: seal(handoff, secret, HANDOFF_TTL_SECONDS) });
  } catch (err) {
    console.error("⚠️ Sign in with ChurchSuite failed:", err);
    return back(saved.redirect, { error: "failed" });
  }
}
