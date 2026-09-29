import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { getMember } from "@/lib/destinyOne/adminData.server";
import { dbFailure, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";

// POST /api/admin/destiny-one/members/[id]/decline
//
// Declines an access request. The account is suspended rather than deleted, so
// the same person signing in again doesn't reappear in the queue; reinstating
// from the member page undoes it.

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;

  const before = await getMember(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.status !== "pending") return NextResponse.json({ error: "Only pending requests can be declined." }, { status: 409 });

  const { error } = await createServiceClient().from("d1_members").update({ status: "suspended" }).eq("id", id);
  if (error) return dbFailure(error);

  await recordAudit({
    action: "reject",
    section: "destiny_one",
    entity: "access request",
    entityId: id,
    entityLabel: before.displayName,
    summary: `Declined the Destiny One access request from ${before.displayName}`,
  });
  return NextResponse.json({ ok: true });
}
