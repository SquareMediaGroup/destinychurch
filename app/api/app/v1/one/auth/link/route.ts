import { authenticate, toMe } from "@/lib/destinyOne/auth.server";
import { linkMember } from "@/lib/destinyOne/identity.server";
import { limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

// POST /api/app/v1/one/auth/link
//
// Called by the app after every sign-in (email code or ChurchSuite). Matches
// the account to its ChurchSuite record and returns the member as it now
// stands. A `pending` result is normal for a first sign-in the church can't
// yet match — the app shows "we'll be in touch", not an error.

export const dynamic = "force-dynamic";

export const POST = oneRoute(async (request) => {
  const user = await authenticate(request);
  limit("link", user.id, 10);
  const member = await linkMember(user);
  return oneJson(await toMe(member));
});
