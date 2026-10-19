import { NextResponse } from "next/server";
import { callerRoles } from "@/lib/destinyOne/admin.server";

// GET /api/admin/destiny-one/whoami
//
// Which Destiny One admin areas the caller can open. The D1 Admin desktop app
// asks once after sign-in to decide which sidebar sections to show; every
// route still checks for itself. Open to any signed-in user (lib/adminRoles.ts
// OPEN_PATHS) because it only ever describes the caller: a leader with no
// admin role gets all false and the app shows chat only.

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await callerRoles();
  if (result instanceof NextResponse) return result;
  const { roles } = result;
  return NextResponse.json({
    destinyOneAdmin: roles.destiny_one_admin || roles.super_admin,
    safeguardingAdmin: roles.safeguarding_admin || roles.super_admin,
    // Reading a conversation needs the role itself; super admin alone isn't enough.
    transcriptReader: roles.safeguarding_admin,
    superAdmin: roles.super_admin,
  });
}
