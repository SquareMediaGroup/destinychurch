import { requireMember } from "@/lib/destinyOne/auth.server";
import { listPrayerRequests } from "@/lib/destinyOne/chat.server";
import { oneJson, oneRoute, requireUuid, type IdParams } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/groups/[id]/prayers
//        The group's prayer requests, open and answered, newest first (up to 100).
//        The same messages the chat shows: only since you joined, none that were
//        deleted, none from people you've blocked.

export const dynamic = "force-dynamic";

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  return oneJson(await listPrayerRequests(caller, id));
});
