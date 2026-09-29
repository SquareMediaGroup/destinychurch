import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { communityPeople, listCommunities, listGroups } from "@/lib/destinyOne/adminData.server";
import { dbFailure, parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { adminCommunityPatchSchema } from "@/lib/destinyOne/schemas";
import type { AdminCommunityDetail } from "@/lib/destinyOne/adminTypes";

// GET   /api/admin/destiny-one/communities/[id] — the community, its groups (with
//       live member/adult counts and pause reasons) and its members
// PATCH /api/admin/destiny-one/communities/[id]  { name?, description?, archived? }

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;

  const [communities, groups, members] = await Promise.all([listCommunities(), listGroups(id), communityPeople(id)]);
  const community = communities.find((c) => c.id === id);
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const detail: AdminCommunityDetail = { community, groups, members };
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;
  const body = await parseBody(request, adminCommunityPatchSchema);
  if ("response" in body) return body.response;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.data.name) update.name = body.data.name;
  if (body.data.description !== undefined) update.description = body.data.description || null;
  if (body.data.archived !== undefined) update.archived_at = body.data.archived ? new Date().toISOString() : null;

  const { data, error } = await createServiceClient()
    .from("d1_communities")
    .update(update)
    .eq("id", id)
    .select("name")
    .maybeSingle();
  if (error) return dbFailure(error);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAudit({
    action: "update",
    section: "destiny_one",
    entity: "community",
    entityId: id,
    entityLabel: data.name,
    summary: body.data.archived === true
      ? `Archived the Destiny One community "${data.name}"`
      : body.data.archived === false
        ? `Restored the Destiny One community "${data.name}"`
        : `Changed the Destiny One community "${data.name}"`,
  });
  return NextResponse.json({ ok: true });
}
