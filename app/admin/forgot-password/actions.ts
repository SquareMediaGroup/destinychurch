"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";

export async function requestPasswordReset(
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string; message?: string }> {
  const email = formData.get("email")?.toString().trim() ?? "";

  if (!email) {
    return { success: false, error: "Email is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Derive the real origin from the request so the email link points at the
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
    // Route through /auth/callback so the recovery code is exchanged for a
    // session before the user lands on the reset-password form.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/admin/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        error: "Failed to send reset email. Please try again.",
      };
    }

    return {
      success: true,
      message: "If an account exists with this email, you'll receive a password reset link.",
    };
  } catch (err) {
    console.error("Password reset exception:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
