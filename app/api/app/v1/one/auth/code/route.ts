import { createHash } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/utils/supabase/service";
import { clientIp } from "@/lib/rateLimit";
import { sendEmailCard } from "@/lib/emailCard";
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
//
// The code comes from the Supabase admin API (generateLink, which never emails
// by itself) and goes out through Resend. Calling signInWithOtp from here
// would put every sign-in behind Supabase's per-IP limit for our server's
// address and its capped built-in sender. The app still verifies with
// supabase.auth.verifyOtp({ type: "email" }), for new and existing users.

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

    try {
      const { data, error: linkError } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
      if (linkError) throw linkError;
      const code = data.properties?.email_otp;
      if (!code) throw new Error("generateLink returned no email code");
      await sendEmailCard({
        to: email,
        subject: "Your Destiny One sign-in code",
        badge: "Destiny One",
        heading: "Your sign-in code",
        intro: "Type this code into the Destiny One app to sign in. It works once and expires soon. If you didn't ask for it, you can ignore this email.",
        rows: [["Code", code]],
      });
    } catch (err) {
      console.error("⚠️ Destiny One sign-in code not sent:", err);
    }
  });

  return oneJson({ sent: true as const });
});
