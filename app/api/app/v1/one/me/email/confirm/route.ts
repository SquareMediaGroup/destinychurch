import { requireMember } from "@/lib/destinyOne/auth.server";
import { confirmEmailChange } from "@/lib/destinyOne/emailChange.server";
import { OneError, limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { sharedRateLimit } from "@/lib/rateLimit";
import { emailChangeConfirmSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/me/email/confirm  { ticket, code }
//
// Step 2: checks the code sent to the new address and changes the sign-in
// email. The app then refreshes its Supabase session to pick it up. The limit
// keeps guessing the 6 digits hopeless within the ticket's 15 minutes.

export const dynamic = "force-dynamic";

export const POST = oneRoute(async (request) => {
  const { user } = await requireMember(request, { requireConsent: false });
  await limit("email-change-confirm", user.id, 5);
  // The code is 6 digits and the ticket holds no count of wrong guesses, so
  // 5 a minute alone let a signed-in member keep guessing around the clock
  // until a code for an address they don't own came up (and with it any
  // invite waiting for that address). Ten tries an hour, shared across
  // servers, makes that a matter of years. Someone mistyping their own code
  // never gets near it.
  if (await sharedRateLimit(`d1:email-change-confirm:${user.id}`, 10, 60 * 60)) {
    throw new OneError("rate_limited", "Too many tries. Please wait an hour, then send a new code.");
  }
  const { ticket, code } = await readBody(request, emailChangeConfirmSchema);
  return oneJson({ email: await confirmEmailChange(user, ticket, code) });
});
