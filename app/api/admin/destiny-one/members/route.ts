import { NextResponse } from "next/server";
import { listMembers } from "@/lib/destinyOne/adminData.server";
import { requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";

// GET /api/admin/destiny-one/members?status=pending|active|suspended
//
// Everyone with a Destiny One account (erased accounts excluded), with the
// sign-in email — which staff need to find and verify people, and which never
// goes to the app. `status=pending` is the approvals queue.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;

  const status = new URL(request.url).searchParams.get("status");
  if (status && !["pending", "active", "suspended"].includes(status)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }
  try {
    return NextResponse.json(await listMembers(status ?? undefined));
  } catch (err) {
    console.error("⚠️ Destiny One member list failed:", err);
    return NextResponse.json({ error: "Could not load members." }, { status: 500 });
  }
}
