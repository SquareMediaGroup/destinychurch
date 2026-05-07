"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

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

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/reset-password`,
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
