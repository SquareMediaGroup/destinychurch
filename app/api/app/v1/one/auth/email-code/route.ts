import { after } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/utils/supabase/service";
import { clientIp } from "@/lib/rateLimit";
import { sendEmailCard } from "@/lib/emailCard";
import { limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";

// POST /api/app/v1/one/auth/email-code  { email }   (no sign-in needed)
//
// Sends the 6-digit sign-in code, but only to someone who can get in: an
// existing account, an open invite, or (while access requests are open)
// anyone, who then sees the request form (d1_sign_in_status).
//
// The answer is always the same `{ sent: true }`, and the lookup and the email
// both happen after the response (`after()`), so neither the reply nor its
// timing says whether an email belongs to Destiny One. This replaced
// /auth/check, which told anyone whether an email (a child's included) was a
// member.
//
// The code comes from the Supabase admin API (generateLink, which never emails
// by itself) and is sent through Resend, so sign-in doesn't depend on
// Supabase's built-in email sender. The app verifies it as before with
// supabase.auth.verifyOtp({ type: "email" }), for new and existing users.

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email("That doesn't look like an email address.") });

async function sendCode(email: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data: status, error } = await supabase.rpc("d1_sign_in_status", { p_email: email });
    if (error) throw error;
    if (status === "none") return;

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
    console.log("📨 Destiny One sign-in code sent");
  } catch (err) {
    console.error("⚠️ Destiny One sign-in code failed:", err);
  }
}

export const POST = oneRoute(async (request) => {
  limit("email-code", clientIp(request), 20);
  const { email } = await readBody(request, schema);
  // Per address too, so no one can flood someone's inbox. Applies to every
  // email alike, so it says nothing about membership.
  limit("email-code-to", email, 5);

  after(() => sendCode(email));
  return oneJson({ sent: true as const });
});
