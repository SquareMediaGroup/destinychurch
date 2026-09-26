import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { canManageCommunity } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { membersSchema, removeMemberSchema } from "@/lib/destinyOne/schemas";

// POST   /api/app/v1/one/communities/[id]/members  { memberIds, role }
//          Add people (community admins / senior leadership). They land in the
//          community's Announcements group too.
// DELETE /api/app/v1/one/communities/[id]/members  { memberId? }
//          Remove someone, or omit memberId to leave. Leaving a community
//          leaves every group in it.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "community");
  if (!(await canManageCommunity(id, caller.member.id))) {
    throw new OneError("forbidden", "You can't add people to this community.");
  }
  limit("community-members", caller.member.id, 20);
  const { memberIds, role } = await readBody(request, membersSchema);

  const { error } = await createServiceClient().rpc("d1_add_community_members", {
    p_actor: caller.member.id,
    p_community: id,
    p_members: memberIds,
    p_role: role,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
});

export const DELETE = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request, { requireConsent: false });
  const id = requireUuid((await params).id, "community");
  const { memberId } = await readBody(request, removeMemberSchema);

  const { error } = await createServiceClient().rpc("d1_remove_community_member", {
    p_actor: caller.member.id,
    p_community: id,
    p_member: memberId ?? caller.member.id,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
});
