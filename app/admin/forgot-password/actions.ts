"use server";

import { Resend } from "resend";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { buildPasswordResetEmailHtml } from "@/lib/passwordResetEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  if (!email) {
    return { success: false, error: "Email is required." };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("⚠️ RESEND_API_KEY not set — cannot send password reset email");
    return { success: false, error: "Email service is not configured." };
  }

  // Derive the real origin from the request so the link points at the
  // deployment the user is actually on (not a hard-coded localhost fallback).
  const hdrs = await headers();
  const forwardedHost = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const forwardedProto = hdrs.get("x-forwarded-proto") ?? "https";
  const origin =
    hdrs.get("origin") ??
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : null) ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

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
