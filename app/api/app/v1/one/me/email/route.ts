import { requireMember } from "@/lib/destinyOne/auth.server";
import { startEmailChange } from "@/lib/destinyOne/emailChange.server";
import { limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { emailChangeSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/me/email  { email }
//
// Step 1 of changing your own sign-in email: emails a 6-digit code to the new
// address and returns a ticket to send back with it to /me/email/confirm.
// Active members only. See lib/destinyOne/emailChange.server.ts.

export const dynamic = "force-dynamic";

export const POST = oneRoute(async (request) => {
  const { user } = await requireMember(request, { requireConsent: false });
  await limit("email-change", user.id, 3);
  const { email } = await readBody(request, emailChangeSchema);
  return oneJson({ ticket: await startEmailChange(user, email) });
});
