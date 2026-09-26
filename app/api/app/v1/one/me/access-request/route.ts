import { authenticate, loadMemberByAuthUser, toMe } from "@/lib/destinyOne/auth.server";
import { onboardMember, submitAccessRequest } from "@/lib/destinyOne/identity.server";
import { limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { accessRequestSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/me/access-request  { name, dateOfBirth?, note? }
//
// For a signed-in person with no invite (`onboarding: "request_needed"`):
// asks the church team to let them in. A Destiny One Admin reviews it at
// /admin/destiny-one/requests and approves them as an adult or an under-18.
// The date of birth is optional and is never trusted on its own — only the
// admin's decision decides adult status. Resubmitting updates the request.

export const dynamic = "force-dynamic";

export const POST = oneRoute(async (request) => {
  const user = await authenticate(request);
  limit("access-request", user.id, 5);
  const input = await readBody(request, accessRequestSchema);
  const member = (await loadMemberByAuthUser(user.id)) ?? (await onboardMember(user));
  return oneJson(await toMe(await submitAccessRequest(member, input)));
});
