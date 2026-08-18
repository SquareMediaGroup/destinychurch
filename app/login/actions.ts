"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { REMEMBER_COOKIE_NAME } from "@/utils/supabase/sessionCookie";
import { checkRateLimit, resetRateLimit } from "@/lib/loginRateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 400; // matches Supabase's own default cookie lifetime

/**
 * Everything a sign-in does except decide where you end up.
 *
 * Split out because the live chat needs to sign a Host in without leaving the
 * page: `redirect()` throws to unwind the request, which works fine for a
 * full-page form and not at all for a modal that has to stay put and re-render.
 * The rate limit, the Turnstile check and the remember-me cookie are identical
 * either way, so they live here and the two callers differ only in their ending.
 */
async function signInCore(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  // Resolve client IP (works on Vercel and most reverse proxies)
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterSeconds } = checkRateLimit(ip);
  if (!allowed) {
    const mins = Math.ceil(retryAfterSeconds / 60);
    return {
      success: false,
      error: `Too many login attempts. Please try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
    };
  }

  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const turnstileToken = formData.get("cf-turnstile-response")?.toString();
  const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstileOk) {
    return { success: false, error: "Please complete the verification challenge." };
  }

  const remember = formData.get("remember") === "on";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore, { remember });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: "Invalid email or password." };
  }

  cookieStore.set(REMEMBER_COOKIE_NAME, remember ? "1" : "0", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  });

  resetRateLimit(ip);
  return { success: true };
}

export async function adminSignIn(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const result = await signInCore(formData);
  if (!result.success) return result;

  // redirect() throws, so nothing after this runs on the happy path.
  redirect("/admin");
}

/**
 * Sign-in for the Host popup on /live.
 *
 * Same checks as adminSignIn, but returns instead of redirecting so the page
 * behind the modal stays where it is — the Host is in the middle of a service
 * and being thrown to /admin is the one thing that must not happen. The client
 * calls router.refresh() on success to pick the new session up.
 *
 * Note this does NOT check the host role: it establishes who you are, and the
 * chat routes decide what that lets you do (lib/liveChatAuth.ts). Signing in
 * here as a non-Host is a valid thing to do and simply grants no chat powers.
 */
export async function hostSignIn(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  return signInCore(formData);
}

export async function adminSignOut(): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  cookieStore.delete(REMEMBER_COOKIE_NAME);
}
