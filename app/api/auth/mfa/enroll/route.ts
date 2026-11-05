import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { hasAuthenticator } from "@/lib/twoFactor";
import { signedInAdmin } from "@/lib/twoFactor.server";

// Start setting up an authenticator app: a fresh TOTP factor and its QR code.
// It isn't switched on until POST /api/auth/mfa/verify gets a code from it.
//
// Outside /api/admin on purpose: middleware refuses /api/admin to a session
// that hasn't done its second step, and this is how that step gets set up.
// So this route does its own checks: signed in, holds an admin role, and has
// no confirmed authenticator yet (replacing one goes through a backup code or
// a Super Admin reset, never a password alone).

export const dynamic = "force-dynamic";

export async function POST() {
  const admin = await signedInAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (hasAuthenticator(admin.user)) {
    return NextResponse.json(
      { error: "Two-factor sign-in is already set up on this account." },
      { status: 409 },
    );
  }

  // A half-finished set-up (QR shown, never confirmed) is thrown away, so
  // starting again always shows a new code and only one can ever be live.
  const service = createServiceClient();
  for (const factor of admin.user.factors ?? []) {
    if (factor.status !== "verified") {
      await service.auth.admin.mfa.deleteFactor({ userId: admin.user.id, id: factor.id });
    }
  }

  const { data, error } = await admin.session.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Destiny Church",
    friendlyName: "Authenticator app",
  });
  if (error || !data || data.type !== "totp") {
    console.error("❌ two-factor enroll failed:", error?.message);
    return NextResponse.json({ error: "Couldn't start two-factor set-up. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  });
}
