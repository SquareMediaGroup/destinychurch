import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { adminRemoveSchema, adminRoleSchema, membersSchema } from "@/lib/destinyOne/schemas";

// POST   /api/admin/destiny-one/communities/[id]/members  { memberIds, role }
//          Adds people (and so to its Announcements). Community admins must be adults.
// PATCH  /api/admin/destiny-one/communities/[id]/members  { memberId, role }
// DELETE /api/admin/destiny-one/communities/[id]/members  { memberId }
//          Removes them from the community and every group in it; groups left
//          below the rules pause.

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function communityName(id: string): Promise<string> {
  const { data } = await createServiceClient().from("d1_communities").select("name").eq("id", id).maybeSingle();
  return data?.name ?? "community";
}

export async function POST(request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;
  const body = await parseBody(request, membersSchema);
  if ("response" in body) return body.response;

  const { error } = await createServiceClient().rpc("d1_admin_add_community_members", {
    p_community: id,
    p_members: body.data.memberIds,
    p_role: body.data.role,
  });
  if (error) return dbFailure(error);

  const name = await communityName(id);
  await recordAudit({
    action: "update",
    section: "destiny_one",
    entity: "community",
    entityId: id,
    entityLabel: name,
    summary: `Added ${body.data.memberIds.length} ${body.data.memberIds.length === 1 ? "person" : "people"} to the Destiny One community "${name}"`,
    metadata: { memberIds: body.data.memberIds, role: body.data.role },
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;
  const body = await parseBody(request, adminRoleSchema);
  if ("response" in body) return body.response;

  const { error } = await createServiceClient().rpc("d1_admin_set_community_role", {
    p_community: id,
    p_member: body.data.memberId,
    p_role: body.data.role,
  });
  if (error) return dbFailure(error);

  const name = await communityName(id);
  await recordAudit({
    action: "update",
    section: "destiny_one",
    entity: "community",
    entityId: id,
    entityLabel: name,
    summary: `Made someone ${body.data.role === "admin" ? "an admin" : "a member"} of the Destiny One community "${name}"`,
    metadata: { memberId: body.data.memberId, role: body.data.role },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;
  const body = await parseBody(request, adminRemoveSchema);
  if ("response" in body) return body.response;

  const { error } = await createServiceClient().rpc("d1_admin_remove_community_member", {
    p_community: id,
    p_member: body.data.memberId,
  });
  if (error) return dbFailure(error);

  const name = await communityName(id);
  await recordAudit({
    action: "update",
    section: "destiny_one",
    entity: "community",
    entityId: id,
    entityLabel: name,
    summary: `Removed someone from the Destiny One community "${name}"`,
    metadata: { memberId: body.data.memberId },
  });
  return NextResponse.json({ ok: true });
}
