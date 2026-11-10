"use server";

import { Resend } from "resend";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { buildPasswordResetEmailHtml } from "@/lib/passwordResetEmail";
import { clientIp, limitKey, sharedRateLimit } from "@/lib/rateLimit";
import { SITE_ORIGIN } from "@/lib/appApi";

const resend = new Resend(process.env.RESEND_API_KEY);

const hostOf = (value: string) =>
  value.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();

/**
 * The origin to build the reset link on: the one the request came in on when
 * that is a host this app is served from, otherwise the site's own.
 *
 * The link carries the one-time recovery token, and Origin / Host /
 * X-Forwarded-Host are all request headers. Vercel overwrites them today, but
 * behind any proxy that passes them through, a request naming someone else's
 * host would email the victim a genuine reset link pointing at that host, and
 * clicking it would hand over the token. So the headers only ever choose
 * between hosts we already know.
 */
function ownOrigin(candidate: string | null): string {
  const known = [
    SITE_ORIGIN,
    "destinytees.uk",
    "www.destinytees.uk",
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .map(hostOf);
  try {
    const url = new URL(candidate ?? "");
    const host = url.host.toLowerCase();
    if (known.includes(host)) return url.origin;
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    if (local && process.env.NODE_ENV !== "production") return url.origin;
  } catch {
    // No usable origin on the request: fall through to the site's own.
  }
  return SITE_ORIGIN;
}

// Always return the same message whether or not the account exists, so the
// form can't be used to enumerate registered admin emails.
const GENERIC_SUCCESS = {
  success: true as const,
  message:
    "If an account exists with this email, you'll receive a password reset link.",
};

export async function requestPasswordReset(
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string; message?: string }> {
  const email = formData.get("email")?.toString().trim() ?? "";

  if (!email || email.length > 254) {
    return { success: false, error: "Email is required." };
  }

  // Rate-limit per IP so the form can't be used to bomb an inbox with reset
  // emails or burn through the Resend quota.
  const limited = await sharedRateLimit(await limitKey("pwreset", clientIp(await headers())));
  if (limited) {
    return {
      success: false,
      error: "Too many requests. Please wait a few minutes and try again.",
    };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("⚠️ RESEND_API_KEY not set — cannot send password reset email");
    return { success: false, error: "Email service is not configured." };
  }

  // Derive the origin from the request so the link points at the deployment
  // the user is actually on, but only if it is one of ours (see ownOrigin).
  const hdrs = await headers();
  const forwardedHost = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const forwardedProto = hdrs.get("x-forwarded-proto") ?? "https";
  const origin = ownOrigin(
    hdrs.get("origin") ?? (forwardedHost ? `${forwardedProto}://${forwardedHost}` : null),
  );

  try {
    // Generate the recovery token server-side so we can send our own branded
    // email through Resend (instead of Supabase's default mailer).
    const supabase = createServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/admin/reset-password` },
    });

    if (error || !data?.properties?.hashed_token) {
      // Most commonly "user not found" — stay generic so we don't leak which
      // emails are registered.
      if (error) console.warn("Password reset generateLink:", error.message);
      return GENERIC_SUCCESS;
    }

    // Verify on our own domain, then land on the reset form with a live session.
    const resetUrl = `${origin}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/admin/reset-password`;

    const { error: sendError } = await resend.emails.send({
      from: "Destiny Church <noreply@support.squaremediagroup.org>",
      to: email,
      subject: "Reset your Destiny Church admin password",
      html: buildPasswordResetEmailHtml(resetUrl),
    });

    if (sendError) {
      console.error("Password reset email send error:", sendError);
      return {
        success: false,
        error: "Failed to send reset email. Please try again.",
      };
    }

    return GENERIC_SUCCESS;
  } catch (err) {
    console.error("Password reset exception:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
