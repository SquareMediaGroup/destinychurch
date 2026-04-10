"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, resetRateLimit } from "@/lib/loginRateLimit";

export async function adminSignIn(
  _prev: unknown,
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

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: "Invalid email or password." };
  }

  resetRateLimit(ip);
  return { success: true };
}
