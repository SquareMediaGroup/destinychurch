// Destiny One — changing your own sign-in email (POST /me/email, /me/email/confirm).
//
//   1. start   — the app sends the new address. We email a 6-digit code to it
//                and hand the app a sealed ticket {user, new email, code hash}.
//   2. confirm — the app sends the ticket and the code. If they match, the
//                sign-in email is changed with the admin API, and the old
//                address gets a notice (so a change someone else made on an
//                unlocked phone doesn't go unnoticed).
//
// Why not supabase.auth.updateUser({ email }) from the app: that goes through
// Supabase's own mailer and its project-wide "Change email" template, which
// the website portal also uses (with a link, not a code), and with "Secure
// email change" on it needs a code from the OLD address too, which is exactly
// what someone who's lost that inbox can't give. Codes here go out through
// Resend, like the sign-in code (auth/code).
//
// Whether the new address already has an account is only said AFTER the code
// checks out, i.e. to its proven owner, so this can't be used to find out
// whether an email belongs to someone.
//
// The ticket (emailChange.ts) is stateless, no table: it's only good for the
// account that asked, for the address it names, for 15 minutes. Replaying it
// only ever sets that same, proven address again.

import "server-only";
import { checkTicket, issueTicket, newEmailCode } from "@/lib/destinyOne/emailChange";
import { OneError } from "@/lib/destinyOne/http";
import type { AuthUser } from "@/lib/destinyOne/auth.server";
import { sendEmailCard } from "@/lib/emailCard";
import { createServiceClient } from "@/utils/supabase/service";

/**
 * DESTINY_ONE_SECRET where it's set; otherwise the Supabase secret key, which
 * every deploy has. seal() derives its own key from either, so this never
 * uses the Supabase key as-is.
 */
function secret(): string {
  const value = process.env.DESTINY_ONE_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new OneError("unavailable", "Changing your email isn't available right now.");
  return value;
}

/** Emails a code to the new address. Returns the ticket the app sends back with it. */
export async function startEmailChange(user: AuthUser, email: string): Promise<string> {
  if (email === user.email) throw new OneError("invalid", "That's already your email.");

  const code = newEmailCode();
  const ticket = issueTicket(user.id, email, code, secret());
  await sendEmailCard({
    to: email,
    subject: "Your Destiny One email change code",
    badge: "Destiny One",
    heading: "Confirm your new email",
    intro:
      "Type this code into the Destiny One app to start using this email to sign in. It expires in 15 minutes. If you didn't ask for it, you can ignore this email.",
    rows: [["Code", code]],
  });

  return ticket;
}

/** Checks the code and changes the sign-in email. Returns the new address. */
export async function confirmEmailChange(user: AuthUser, ticket: string, code: string): Promise<string> {
  const check = checkTicket(ticket, user.id, code, secret());
  if (!check.ok) {
    throw new OneError(
      "invalid",
      check.reason === "expired" ? "That code has expired. Send a new one." : "That code isn't right. Check it and try again.",
    );
  }
  const email = check.email;
  if (email === user.email) return email; // already done (a retry after a lost reply)

  const { error } = await createServiceClient().auth.admin.updateUserById(user.id, { email, email_confirm: true });
  if (error) {
    if (error.code === "email_exists" || /already been registered|already exists/i.test(error.message)) {
      // They've just proved they own it, so it's safe to say so.
      throw new OneError(
        "invalid",
        "That email already has a Destiny One or Destiny Church account. Use Add account to sign in with it, or ask the church office.",
      );
    }
    console.error("⚠️ Destiny One email change failed:", error.message);
    throw new OneError("unavailable", "Couldn't change your email. Please try again.");
  }

  // The change is done; a failed notice mustn't make it look like it wasn't.
  if (user.email) {
    await sendEmailCard({
      to: user.email,
      subject: "Your Destiny One email was changed",
      badge: "Destiny One",
      heading: "Your email was changed",
      intro:
        "The email you use to sign in to Destiny One has been changed, and this address no longer works for signing in. If this wasn't you, contact the church office straight away.",
      rows: [["New email", email]],
    }).catch((err) => console.error("⚠️ Destiny One email change notice not sent:", err));
  }
  console.log(`📧 Destiny One sign-in email changed for auth user ${user.id}`);
  return email;
}
