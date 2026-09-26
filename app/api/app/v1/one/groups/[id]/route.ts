import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { canManageGroup, getGroup, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { updateGroupSchema } from "@/lib/destinyOne/schemas";

// GET   /api/app/v1/one/groups/[id] — detail, members, what I can do
// PATCH /api/app/v1/one/groups/[id] — rename / describe / archive (managers)
//
// Archiving hides the group from everyone's list and stops all activity; the
// history stays for safeguarding review until the retention purge. Only a
// safeguarding admin can bring one back.

export const dynamic = "force-dynamic";

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  return oneJson(await getGroup(caller, id));
});

export const PATCH = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  const membership = await requireGroupMembership(caller, id);
  if (!(await canManageGroup(id, caller.member.id))) {
    throw new OneError("forbidden", "Only the group's admins can change it.");
  }
  const input = await readBody(request, updateGroupSchema);
  if (input.archived !== undefined && membership.kind === "announcements") {
    throw new OneError("rule_violation", "A community's Announcements group can't be archived.");
  }
  if (input.archived === false) {
    throw new OneError("forbidden", "Ask the safeguarding team to restore an archived group.");
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) update.name = input.name;
  if (input.department !== undefined) update.department = input.department || null;
  if (input.description !== undefined) update.description = input.description || null;
  if (input.archived) Object.assign(update, { state: "archived", freeze_kind: null, frozen_reason: null, frozen_at: null });

  const supabase = createServiceClient();
  const { error } = await supabase.from("d1_groups").update(update).eq("id", id);
  if (error) throw fromDbError(error);

  if (input.archived) {
    await supabase.rpc("d1_emit", {
      topic: `d1-group:${id}`,
      event: "group_state",
      payload: { groupId: id, state: "archived", reason: null },
    });
    return oneJson({ archived: true as const });
  }
  return oneJson(await getGroup(caller, id));
});
