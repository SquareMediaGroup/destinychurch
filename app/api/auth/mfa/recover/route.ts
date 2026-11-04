import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { ADMIN_ROLES } from "@/lib/adminRoles";
import { recordAudit } from "@/lib/audit.server";
import { hasAuthenticator } from "@/lib/twoFactor";
import {
  removeTwoFactor,
  sendBackupCodeUsedEmail,
  signedInAdmin,
  spendBackupCode,
} from "@/lib/twoFactor.server";

// Sign in with a backup code instead of the authenticator app.
//
// A backup code doesn't let you into the admin by itself: it removes the old
// authenticator (and the other backup codes), and the person sets up a new one
// straight away on /login/2fa, which gives them a fresh 8. The usual reason
// for reaching for a backup code is a lost or replaced phone, and this way the
// lost phone stops working the moment it's done.
//
// Five wrong codes in fifteen minutes locks backup codes for fifteen minutes
// (admin_mfa_lockouts, counted in the database so every server instance
// agrees). Every use is emailed to the account and written to the audit log.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await signedInAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasAuthenticator(admin.user)) {
    return NextResponse.json({ error: "Two-factor sign-in isn't set up on this account yet." }, { status: 400 });
  }

  const ip = clientIp(await headers());
  if (checkRateLimit(`mfa-recover-ip:${ip}`, 10).limited) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";

  const service = createServiceClient();
  const result = await spendBackupCode(service, admin.user.id, code);
  const actor = {
    id: admin.user.id,
    email: admin.user.email ?? null,
    roles: ADMIN_ROLES.filter((role) => admin.roles[role]),
  };

  if (!result.ok) {
    await recordAudit({
      actor,
      action: "login",
      section: "account",
      entity: "two-factor sign-in",
      entityId: admin.user.id,
      entityLabel: admin.user.email ?? admin.user.id,
      summary:
        result.reason === "locked"
          ? `Backup codes locked for ${admin.user.email ?? "an admin"} after repeated wrong codes`
          : `Wrong backup code entered for ${admin.user.email ?? "an admin"}`,
      changes: null,
      metadata: { ok: false, ip },
    });
    return result.reason === "locked"
      ? NextResponse.json(
          { error: "Too many wrong backup codes. Wait 15 minutes, or ask a Super Admin to reset your two-factor sign-in." },
          { status: 429 },
        )
      : NextResponse.json({ error: "That backup code didn't work. Each code works once." }, { status: 400 });
  }

  await removeTwoFactor(service, admin.user.id);
  await recordAudit({
    actor,
    action: "login",
    section: "account",
    entity: "two-factor sign-in",
    entityId: admin.user.id,
    entityLabel: admin.user.email ?? admin.user.id,
    summary: `${admin.user.email ?? "An admin"} used a backup code; their authenticator app was removed to be set up again`,
    changes: null,
    metadata: { ok: true, ip },
  });
  void sendBackupCodeUsedEmail(admin.user.email);

  return NextResponse.json({ ok: true });
}
