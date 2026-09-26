import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { membersSchema, removeMemberSchema } from "@/lib/destinyOne/schemas";

// POST   /api/app/v1/one/groups/[id]/members  { memberIds, role }
//          Add people (group admins, community admins, senior leadership).
//          They must already be in the community. Admins must be adults.
// DELETE /api/app/v1/one/groups/[id]/members  { memberId? }
//          Remove someone, or omit memberId to leave. Never blocked: if it
//          breaks the 2-adult rule the group freezes and safeguarding is told.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  limit("group-members", caller.member.id, 20);
  const { memberIds, role } = await readBody(request, membersSchema);

  const { error } = await createServiceClient().rpc("d1_add_group_members", {
    p_actor: caller.member.id,
    p_group: id,
    p_members: memberIds,
    p_role: role,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
});

export const DELETE = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request, { requireConsent: false });
  const id = requireUuid((await params).id, "group");
  const { memberId } = await readBody(request, removeMemberSchema);

  const { error } = await createServiceClient().rpc("d1_remove_group_member", {
    p_actor: caller.member.id,
    p_group: id,
    p_member: memberId ?? caller.member.id,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
});
