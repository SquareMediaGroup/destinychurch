import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { adminGroupSchema } from "@/lib/destinyOne/schemas";

// POST /api/admin/destiny-one/communities/[id]/groups
//   { name, department?, description?, memberIds, adminIds? }
//
// A department sub-group. Everyone must already be in the community. The
// database refuses fewer than 3 people or 2 verified adults, and minor admins,
// with a message that's shown to the admin as-is.

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const communityId = (await params).id;
  const body = await parseBody(request, adminGroupSchema);
  if ("response" in body) return body.response;

  const { data, error } = await createServiceClient().rpc("d1_admin_create_group", {
    p_community: communityId,
    p_name: body.data.name,
    p_department: body.data.department ?? null,
    p_description: body.data.description ?? null,
    p_members: body.data.memberIds,
    p_admins: body.data.adminIds,
  });
  if (error) return dbFailure(error);

  await recordAudit({
    action: "create",
    section: "destiny_one",
    entity: "group",
    entityId: data as string,
    entityLabel: body.data.name,
    summary: `Created the Destiny One group "${body.data.name}"`,
    metadata: { communityId, memberCount: new Set([...body.data.memberIds, ...body.data.adminIds]).size },
  });
  return NextResponse.json({ id: data }, { status: 201 });
}
