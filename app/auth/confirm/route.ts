import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

// Verifies an email OTP token hash (e.g. a password-recovery link generated
// server-side) and establishes the session, then forwards to `next`. Keeping
// this on our own domain means the link in the email is always a clean
// destinychurch URL — never the raw supabase.co verify endpoint.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only honor internal, same-origin paths to avoid open-redirect abuse.
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/admin/redirects";

  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/admin-login?error=link_expired`);
}
