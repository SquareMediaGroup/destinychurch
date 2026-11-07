"use server";

import { isAuthWeakPasswordError } from "@supabase/supabase-js";
import { passwordRejection, type PasswordRejection } from "@destiny/shared";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const MIN_LENGTH = 8;

export interface ResetPasswordState {
  success: boolean;
  error?: string;
  /** Supabase refused the password: too weak, or found in a data breach (leaked password protection). */
  rejection?: PasswordRejection;
  /**
   * The account has two-factor sign-in, and Supabase won't change its
   * password from a session that hasn't passed it (a reset link is password-
   * level only). The page links to /login/2fa, which comes back here.
   */
  needsTwoFactor?: boolean;
}

export async function resetPassword(
  _prev: unknown,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!password || !confirmPassword) {
    return { success: false, error: "Both password fields are required." };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  if (password.length < MIN_LENGTH) {
    return { success: false, error: `Password must be at least ${MIN_LENGTH} characters.` };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { error } = await supabase.auth.updateUser({ password });

    if (isAuthWeakPasswordError(error)) {
      return { success: false, rejection: passwordRejection(error.reasons, MIN_LENGTH) };
    }

    if (error?.code === "insufficient_aal") {
      return {
        success: false,
        needsTwoFactor: true,
        error: "Your account has two-factor sign-in, so confirm it's you with your authenticator app first.",
      };
    }

    if (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        error: error.message || "Failed to reset password. Please try again or request a new link.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Password reset exception:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
