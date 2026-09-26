import { canCreateGroup } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { getGroup } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { createGroupSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/communities/[id]/groups
//   { name, department?, description?, memberIds }
//
// Creates a department sub-group. Group leaders and senior leadership only.
// The database refuses anything under 3 people or 2 verified adults — there
// are no one-to-one chats — and says why in words the app can show.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const communityId = requireUuid((await params).id, "community");
  if (!canCreateGroup(caller.policy)) {
    throw new OneError("forbidden", "Only group leaders and senior leadership can create groups.");
  }
  limit("create-group", caller.member.id, 10);
  const input = await readBody(request, createGroupSchema);

  const { data, error } = await createServiceClient().rpc("d1_create_group", {
    p_actor: caller.member.id,
    p_community: communityId,
    p_name: input.name,
    p_department: input.department ?? null,
    p_description: input.description ?? null,
    p_members: input.memberIds,
  });
  if (error) throw fromDbError(error);

  return oneJson(await getGroup(caller, data as string), 201);
});
