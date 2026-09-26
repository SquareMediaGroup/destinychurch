import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { adminRemoveSchema, adminRoleSchema, membersSchema } from "@/lib/destinyOne/schemas";

// POST   /api/admin/destiny-one/groups/[id]/members  { memberIds, role }
// PATCH  /api/admin/destiny-one/groups/[id]/members  { memberId, role }  — admins must be adults
// DELETE /api/admin/destiny-one/groups/[id]/members  { memberId }
//          Never blocked; if it breaks the rule the group pauses and
//          safeguarding + Destiny One Admins are told.

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function audit(groupId: string, summary: (name: string) => string, metadata: Record<string, unknown>) {
  const { data } = await createServiceClient().from("d1_groups").select("name").eq("id", groupId).maybeSingle();
  const name = data?.name ?? "group";
  await recordAudit({
    action: "update",
    section: "destiny_one",
    entity: "group",
    entityId: groupId,
    entityLabel: name,
    summary: summary(name),
    metadata,
  });
}

export async function POST(request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;
  const body = await parseBody(request, membersSchema);
  if ("response" in body) return body.response;

  const { error } = await createServiceClient().rpc("d1_admin_add_group_members", {
    p_group: id,
    p_members: body.data.memberIds,
    p_role: body.data.role,
  });
  if (error) return dbFailure(error);
  const n = body.data.memberIds.length;
  await audit(id, (name) => `Added ${n} ${n === 1 ? "person" : "people"} to the Destiny One group "${name}"`, {
    memberIds: body.data.memberIds,
    role: body.data.role,
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;
  const body = await parseBody(request, adminRoleSchema);
  if ("response" in body) return body.response;

  const { error } = await createServiceClient().rpc("d1_admin_set_group_role", {
    p_group: id,
    p_member: body.data.memberId,
    p_role: body.data.role,
  });
  if (error) return dbFailure(error);
  await audit(id, (name) => `Changed a member's role in the Destiny One group "${name}"`, body.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;
  const body = await parseBody(request, adminRemoveSchema);
  if ("response" in body) return body.response;

  const { error } = await createServiceClient().rpc("d1_admin_remove_group_member", {
    p_group: id,
    p_member: body.data.memberId,
  });
  if (error) return dbFailure(error);
  await audit(id, (name) => `Removed someone from the Destiny One group "${name}"`, body.data);
  return NextResponse.json({ ok: true });
}
