import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { listCommunities } from "@/lib/destinyOne/adminData.server";
import { dbFailure, parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { adminCommunitySchema } from "@/lib/destinyOne/schemas";

// GET  /api/admin/destiny-one/communities — with member, group and paused counts
// POST /api/admin/destiny-one/communities  { name, description?, adminIds? }
//        Creates it with its Announcements group, which stays paused until at
//        least 3 people including 2 adults have joined.

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  try {
    return NextResponse.json(await listCommunities());
  } catch (err) {
    console.error("⚠️ Destiny One communities failed:", err);
    return NextResponse.json({ error: "Could not load communities." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const body = await parseBody(request, adminCommunitySchema);
  if ("response" in body) return body.response;

  const { data, error } = await createServiceClient().rpc("d1_admin_create_community", {
    p_name: body.data.name,
    p_description: body.data.description ?? null,
    p_admins: body.data.adminIds,
  });
  if (error) return dbFailure(error);

  await recordAudit({
    action: "create",
    section: "destiny_one",
    entity: "community",
    entityId: data as string,
    entityLabel: body.data.name,
    summary: `Created the Destiny One community "${body.data.name}"`,
  });
  return NextResponse.json({ id: data }, { status: 201 });
}
