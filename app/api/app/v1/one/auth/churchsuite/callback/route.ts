import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { seal, unseal } from "@/lib/destinyOne/churchsuite";
import { exchangeAuthCode, getCurrentUser } from "@/lib/destinyOne/churchsuite.server";
import { onboardMember } from "@/lib/destinyOne/identity.server";
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

/**
 * True when this account must not be signed into via ChurchSuite:
 *   - it's a member already linked to a different ChurchSuite login, or
 *   - it has an admin role or a staff record and isn't already linked to THIS
 *     ChurchSuite login. A matching email isn't enough for those accounts —
 *     the email on a ChurchSuite user is editable by ChurchSuite admins — so
 *     they keep signing in by email until the link exists by user id.
 * Fails closed: a lookup error refuses.
 */
async function isProtectedAccount(
  supabase: ReturnType<typeof createServiceClient>,
  authUserId: string,
  churchsuiteUserId: number,
): Promise<boolean> {
  const [admin, staff, member] = await Promise.all([
    supabase.from("admin_roles").select("auth_user_id").eq("auth_user_id", authUserId).maybeSingle(),
    supabase.from("hr_staff").select("id").eq("auth_user_id", authUserId).maybeSingle(),
    supabase.from("d1_members").select("churchsuite_user_id").eq("auth_user_id", authUserId).maybeSingle(),
  ]);
  if (admin.error || staff.error || member.error) return true;
  const linked = (member.data?.churchsuite_user_id as number | null | undefined) ?? null;
  if (linked !== null && linked !== churchsuiteUserId) return true;
  return Boolean(admin.data || staff.data) && linked !== churchsuiteUserId;
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

    // ChurchSuite vouching for an address is enough to create a member, not to
    // take over an account that already holds more. Whoever can edit users in
    // ChurchSuite could otherwise give themselves a website admin's or staff
    // member's email and come away with that person's Supabase session.
    if (await isProtectedAccount(supabase, link.data.user.id, csUser.userId)) {
      console.error(`⚠️ Sign in with ChurchSuite refused for protected account ${link.data.user.id}`);
      return back(saved.redirect, { error: "use_email_sign_in" });
    }

    await onboardMember(
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
