import { requireMember } from "@/lib/destinyOne/auth.server";
import { getCommunity } from "@/lib/destinyOne/chat.server";
import { oneJson, oneRoute, requireUuid, type IdParams } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/communities/[id]

export const dynamic = "force-dynamic";

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "community");
  return oneJson(await getCommunity(caller, id));
});
