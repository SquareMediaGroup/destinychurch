import { requireMember } from "@/lib/destinyOne/auth.server";
import { confirmEmailChange } from "@/lib/destinyOne/emailChange.server";
import { limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
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
  const { ticket, code } = await readBody(request, emailChangeConfirmSchema);
  return oneJson({ email: await confirmEmailChange(user, ticket, code) });
});
