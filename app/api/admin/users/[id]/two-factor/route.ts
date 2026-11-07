import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit, readForAudit } from "@/lib/audit.server";
import { removeTwoFactor, sendTwoFactorResetEmail } from "@/lib/twoFactor.server";

// Reset someone's two-factor sign-in: for an admin who has lost both their
// phone and their backup codes. They are asked to set it up again the next
// time they open the admin.
//
// Super Admin only. /api/admin/users has no ROUTE_RULES entry, so it falls
// through to lib/adminRoles.ts's fail-closed default, the same as the rest of
// this API. Logged, and the person is emailed.

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const before = await readForAudit("admin_roles", id, "email", "auth_user_id");
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const email = typeof before.email === "string" ? before.email : null;

  try {
    await removeTwoFactor(createServiceClient(), id);
  } catch (err) {
    console.error("❌ two-factor reset failed:", err);
    return NextResponse.json({ error: "Couldn't reset two-factor sign-in. Please try again." }, { status: 500 });
  }

  await recordAudit({
    action: "delete",
    section: "users",
    entity: "two-factor sign-in",
    entityId: id,
    entityLabel: email,
    summary: `Reset two-factor sign-in for ${email ?? id}`,
    changes: null,
  });

  const resetBy = (await headers()).get("x-dc-actor-email");
  void sendTwoFactorResetEmail(email, resetBy);

  return NextResponse.json({ ok: true });
}
