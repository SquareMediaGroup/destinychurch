import { canCreateCommunity } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { getCommunity, listCommunities } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { createCommunitySchema } from "@/lib/destinyOne/schemas";

// GET  /api/app/v1/one/communities — my communities, each with the groups I'm in
// POST /api/app/v1/one/communities — create one (senior leadership); comes with
//                                    its Announcements group

export const dynamic = "force-dynamic";

export const GET = oneRoute(async (request) => {
  const caller = await requireMember(request);
  return oneJson(await listCommunities(caller));
});

export const POST = oneRoute(async (request) => {
  const caller = await requireMember(request);
  if (!canCreateCommunity(caller.policy)) {
    throw new OneError("forbidden", "Only senior leadership can create communities.");
  }
  limit("create-community", caller.member.id, 5);
  const input = await readBody(request, createCommunitySchema);

  const { data, error } = await createServiceClient().rpc("d1_create_community", {
    p_actor: caller.member.id,
    p_name: input.name,
    p_description: input.description ?? null,
  });
  if (error) throw fromDbError(error);

  return oneJson(await getCommunity(caller, data as string), 201);
});
