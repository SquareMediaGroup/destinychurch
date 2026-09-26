import { authenticate, toMe } from "@/lib/destinyOne/auth.server";
import { onboardMember } from "@/lib/destinyOne/identity.server";
import { limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

// POST /api/app/v1/one/auth/link
//
// Called by the app after every sign-in (email code or ChurchSuite). Accepts
// an open invite for the email if there is one, and returns the member as it
// now stands. `onboarding` in the response tells the app which screen to show:
// a first sign-in without an invite is `request_needed` (the access request
// form), not an error.

export const dynamic = "force-dynamic";

export const POST = oneRoute(async (request) => {
  const user = await authenticate(request);
  limit("link", user.id, 10);
  const member = await onboardMember(user);
  return oneJson(await toMe(member));
});
