import { createHash } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/utils/supabase/service";
import { clientIp } from "@/lib/rateLimit";
import { limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";

// POST /api/app/v1/one/auth/code  { email }   (no sign-in needed)
//
// Sends the email sign-in code, but only to someone who can get in: an
// existing member, an open invite, or anyone while access requests are open
// (d1_sign_in_status). For everyone else it silently sends nothing.
//
// The reply is the same either way, and the code is sent after the reply
// (`after()`), so neither the answer nor its timing tells a stranger whether
// an email belongs to a Destiny One member, who may be a child. This replaces
// /auth/check, which said so outright (decided 2026-09-28). Someone who can't
// get in simply never receives a code; the app tells them what to do if none
// arrives.

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email("That doesn't look like an email address.") });

/** Rate-limit keys shouldn't hold email addresses, even briefly. */
const hashed = (email: string) => createHash("sha256").update(email).digest("hex").slice(0, 32);

export const POST = oneRoute(async (request) => {
  await limit("auth-code-ip", clientIp(request), 10);
  const { email } = await readBody(request, schema);
  await limit("auth-code-email", hashed(email), 3);

  after(async () => {
    const supabase = createServiceClient();
    const { data: status, error } = await supabase.rpc("d1_sign_in_status", { p_email: email });
    if (error) {
      console.error("⚠️ Destiny One sign-in check failed:", error.message);
      return;
    }
    if (status === "none") return; // can't get in: send nothing, say nothing

    const { error: otpError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (otpError) console.error("⚠️ Destiny One sign-in code not sent:", otpError.message);
  });

  return oneJson({ sent: true as const });
});
