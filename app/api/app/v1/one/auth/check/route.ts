import { z } from "zod";
import { createServiceClient } from "@/utils/supabase/service";
import { clientIp } from "@/lib/rateLimit";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";

// POST /api/app/v1/one/auth/check  { email }   (no sign-in needed)
//
// Asked by the app BEFORE it sends a sign-in code, so someone who can't get
// in isn't sent an email at all. Can sign in: an existing account, an open
// invite, or (while access requests are open) anyone, who then sees the
// request form. Otherwise: "no account".
//
// This does say whether an email belongs to Destiny One, so it's rate-limited
// per IP and returns nothing else about the person.

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email("That doesn't look like an email address.") });

export const POST = oneRoute(async (request) => {
  limit("auth-check", clientIp(request), 20);
  const { email } = await readBody(request, schema);

  const { data, error } = await createServiceClient().rpc("d1_sign_in_status", { p_email: email });
  if (error) throw fromDbError(error);
  if (data === "none") {
    throw new OneError(
      "not_verified",
      "We couldn't find a Destiny One account for this email. Ask your team leader or the church office for an invite.",
    );
  }
  return oneJson({ canSignIn: true as const });
});
