import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { groupPeople, listGroups } from "@/lib/destinyOne/adminData.server";
import { dbFailure, parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { updateGroupSchema } from "@/lib/destinyOne/schemas";
import type { AdminGroupDetail } from "@/lib/destinyOne/adminTypes";

// GET   /api/admin/destiny-one/groups/[id] — the group, counts, members. No messages.
// PATCH /api/admin/destiny-one/groups/[id]  { name?, department?, description?, archived? }
//       Archiving hides it and stops all activity; history stays for
//       safeguarding until the retention purge. archived:false restores it
//       (the 2-adult rule is re-checked straight away).

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;

  const supabase = createServiceClient();
  const { data: row } = await supabase.from("d1_groups").select("community_id").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [groups, members, { data: community }] = await Promise.all([
    listGroups(row.community_id),
    groupPeople(id),
    supabase.from("d1_communities").select("name").eq("id", row.community_id).single(),
  ]);
  const group = groups.find((g) => g.id === id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const detail: AdminGroupDetail = { group, communityName: community?.name ?? "", members };
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;
  const body = await parseBody(request, updateGroupSchema);
  if ("response" in body) return body.response;
  const input = body.data;

  const supabase = createServiceClient();
  const { data: before } = await supabase.from("d1_groups").select("name, kind, state").eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (input.archived !== undefined && before.kind === "announcements") {
    return NextResponse.json({ error: "A community's Announcements can't be archived." }, { status: 422 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name) update.name = input.name;
  if (input.department !== undefined) update.department = input.department || null;
  if (input.description !== undefined) update.description = input.description || null;
  if (input.archived === true) {
    Object.assign(update, { state: "archived", freeze_kind: null, frozen_reason: null, frozen_at: null });
  } else if (input.archived === false && before.state === "archived") {
    // Back to active, then let the rule decide whether it has to pause.
    update.state = "active";
  }

  const { error } = await supabase.from("d1_groups").update(update).eq("id", id);
  if (error) return dbFailure(error);
  if (input.archived !== undefined) {
    await supabase.rpc("d1_evaluate_group", { p_group: id });
    await supabase.rpc("d1_emit", {
      topic: `d1-group:${id}`,
      event: "group_state",
      payload: { groupId: id, state: input.archived ? "archived" : "active", reason: null },
    });
  }

  await recordAudit({
    action: "update",
    section: "destiny_one",
    entity: "group",
    entityId: id,
    entityLabel: input.name ?? before.name,
    summary: input.archived === true
      ? `Archived the Destiny One group "${before.name}"`
      : input.archived === false
        ? `Restored the Destiny One group "${before.name}"`
        : `Changed the Destiny One group "${before.name}"`,
  });
  return NextResponse.json({ ok: true });
}
