import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { ADMIN_ROLES } from "@/lib/adminRoles";
import { recordAudit } from "@/lib/audit.server";
import { issueBackupCodes, signedInAdmin } from "@/lib/twoFactor.server";

// Check a 6-digit code from the authenticator app. On success Supabase
// upgrades the session cookie to aal2, which is what middleware looks for.
//
// When the factor wasn't confirmed yet this is the end of set-up, and the
// response carries the 8 backup codes: the only time they are ever shown.
// Whether it was set-up is read from Supabase's own record of the factor,
// never from the request.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await signedInAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Supabase rate-limits MFA verification itself; this is a cheaper first
  // fence per caller so a script hammering it never reaches Supabase.
  const ip = clientIp(await headers());
  if (checkRateLimit(`mfa-verify:${admin.user.id}`, 10).limited || checkRateLimit(`mfa-verify-ip:${ip}`, 20).limited) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { factorId?: unknown; code?: unknown } | null;
  const factorId = typeof body?.factorId === "string" ? body.factorId : "";
  const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code from your authenticator app." }, { status: 400 });
  }

  const factor = (admin.user.factors ?? []).find((f) => f.id === factorId && f.factor_type === "totp");
  if (!factor) {
    return NextResponse.json({ error: "That authenticator isn't on this account. Start again." }, { status: 400 });
  }
  const settingUp = factor.status !== "verified";

  const { error } = await admin.session.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    return NextResponse.json(
      { error: "That code didn't work. Check the time on your phone is right, and use the newest code." },
      { status: 400 },
    );
  }

  if (!settingUp) return NextResponse.json({ ok: true });

  const backupCodes = await issueBackupCodes(createServiceClient(), admin.user.id);
  await recordAudit({
    actor: {
      id: admin.user.id,
      email: admin.user.email ?? null,
      roles: ADMIN_ROLES.filter((role) => admin.roles[role]),
    },
    action: "create",
    section: "account",
    entity: "two-factor sign-in",
    entityId: admin.user.id,
    entityLabel: admin.user.email ?? admin.user.id,
    summary: `${admin.user.email ?? "An admin"} set up two-factor sign-in`,
    changes: null,
  });

  return NextResponse.json({ ok: true, backupCodes });
}
