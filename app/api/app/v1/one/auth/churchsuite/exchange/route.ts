import { clientIp } from "@/lib/rateLimit";
import { unseal, verifierMatches } from "@/lib/destinyOne/churchsuite";
import { OneError, limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { exchangeSchema } from "@/lib/destinyOne/schemas";
import type { Handoff } from "@/lib/destinyOne/signin.server";

// POST /api/app/v1/one/auth/churchsuite/exchange  { code, verifier }
//
// "Sign in with ChurchSuite", step 3. The app swaps the one-time code from the
// callback redirect, plus the PKCE verifier only it holds, for a Supabase
// token hash. It then calls supabase.auth.verifyOtp({ token_hash, type }) to
// get a normal session, and POSTs ../../link like any other sign-in.

export const dynamic = "force-dynamic";

export const POST = oneRoute(async (request) => {
  limit("cs-exchange", clientIp(request), 10);
  const secret = process.env.DESTINY_ONE_SECRET;
  if (!secret) throw new OneError("unavailable", "Sign in with ChurchSuite isn't available right now.");

  const { code, verifier } = await readBody(request, exchangeSchema);
  const handoff = unseal<Handoff>(code, secret);
  if (!handoff || !verifierMatches(verifier, handoff.appChallenge)) {
    throw new OneError("unauthenticated", "That sign-in has expired. Please try again.");
  }
  return oneJson({ tokenHash: handoff.tokenHash, type: "magiclink" as const });
});
