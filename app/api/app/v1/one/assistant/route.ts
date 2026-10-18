import { requireMember } from "@/lib/destinyOne/auth.server";
import { assistantGroupId } from "@/lib/destinyOne/assistant.server";
import { getGroupSummary } from "@/lib/destinyOne/chat.server";
import { oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/assistant
//
// My one-to-one chat with DestinyAI, as a chat-list row. It's made the first
// time anyone asks for it, so every member has one. Messages go through the
// ordinary /groups/<id>/messages routes; DestinyAI answers each one
// (lib/destinyOne/assistant.server.ts).

export const dynamic = "force-dynamic";

export const GET = oneRoute(async (request) => {
  const caller = await requireMember(request);
  return oneJson(await getGroupSummary(caller, await assistantGroupId(caller)));
});
