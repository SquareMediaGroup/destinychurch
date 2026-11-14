import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, parseBody, requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { adminU18Schema } from "@/lib/destinyOne/schemas";

// POST /api/admin/destiny-one/safeguarding/groups/[id]/u18  { suitable }
//
// Mark a group suitable (or not) for under-18s. Only a Safeguarding Admin can: a
// leader cannot, which is the point. Until a group is marked, under-18s can't see
// it in Discover groups, ask to join, or be approved into it. Taking the mark away
// withdraws under-18s' waiting requests. Recorded in the audit log.

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const groupId = (await params).id;

  const parsed = await parseBody(request, adminU18Schema);
  if ("response" in parsed) return parsed.response;

  const supabase = createServiceClient();
  const { data: group } = await supabase.from("d1_groups").select("name, kind").eq("id", groupId).maybeSingle();
  if (!group || group.kind !== "group") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.rpc("d1_set_u18_suitable", { p_group: groupId, p_suitable: parsed.data.suitable, p_admin: admin.userId });
  if (error) return dbFailure(error);

  await recordAudit({
    action: "moderate",
    section: "safeguarding",
    entity: "chat group",
    entityId: groupId,
    entityLabel: group.name,
    summary: parsed.data.suitable
      ? `Marked the Destiny One group "${group.name}" suitable for under-18s`
      : `Removed the suitable-for-under-18s mark from the Destiny One group "${group.name}"`,
    metadata: { suitable: parsed.data.suitable },
  });
  return NextResponse.json({ ok: true });
}
