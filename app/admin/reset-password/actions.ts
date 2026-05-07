"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";

export async function resetPassword(
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers();
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!password || !confirmPassword) {
    return { success: false, error: "Both password fields are required." };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data, error } = await supabase.auth.updateUser({ password });

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
