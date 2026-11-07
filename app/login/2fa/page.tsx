import { redirect } from "next/navigation";
import { hasAuthenticator, safeNextPath } from "@/lib/twoFactor";
import { signedInAdmin } from "@/lib/twoFactor.server";
import TwoFactorClient from "./TwoFactorClient";

export const metadata = {
  title: "Two-Factor Sign-In",
};

// The session decides everything here, so never cache it.
export const dynamic = "force-dynamic";

/**
 * The second step of an admin sign-in. middleware.ts sends every admin here
 * until their session has passed it (lib/twoFactor.ts):
 *   - no authenticator app yet → set one up, then save 8 backup codes
 *   - has one → enter a code from it, or use a backup code
 */
export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const admin = await signedInAdmin();
  // Signed out, or signed in without an admin role: two-factor isn't theirs to do.
  if (!admin) redirect("/login");
  if (admin.level === "aal2") redirect(next);

  const factor = (admin.user.factors ?? []).find(
    (f) => f.factor_type === "totp" && f.status === "verified",
  );

  return (
    <TwoFactorClient
      initialMode={hasAuthenticator(admin.user) ? "verify" : "setup"}
      factorId={factor?.id ?? null}
      email={admin.user.email ?? ""}
      next={next}
    />
  );
}
