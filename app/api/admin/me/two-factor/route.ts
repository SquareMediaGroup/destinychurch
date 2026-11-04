import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { issueBackupCodes, signedInAdmin, unusedBackupCodeCount } from "@/lib/twoFactor.server";

// The caller's own two-factor status, and "give me new backup codes".
//
// Under /api/admin, so middleware has already required a session that did
// its second step; the POST checks again here anyway, because issuing codes
// is the one thing a stolen password must never be able to do.

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await signedInAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const remaining = await unusedBackupCodeCount(createServiceClient(), admin.user.id);
  return NextResponse.json({ enabled: admin.level === "aal2", backupCodesRemaining: remaining });
}

export async function POST() {
  const admin = await signedInAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.level !== "aal2") {
    return NextResponse.json({ error: "Sign in with your authenticator app first." }, { status: 401 });
  }

  const backupCodes = await issueBackupCodes(createServiceClient(), admin.user.id);
  await recordAudit({
    action: "update",
    section: "account",
    entity: "two-factor sign-in",
    entityId: admin.user.id,
    entityLabel: admin.user.email ?? admin.user.id,
    summary: `${admin.user.email ?? "An admin"} replaced their backup codes`,
    changes: null,
  });
  return NextResponse.json({ backupCodes });
}
