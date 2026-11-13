import { requireMember } from "@/lib/destinyOne/auth.server";
import { requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { createScheduledMessage, listScheduledMessages } from "@/lib/destinyOne/scheduledSends.server";
import { scheduleMessageSchema } from "@/lib/destinyOne/schemas";

// GET  /api/app/v1/one/groups/[id]/scheduled
//        The messages waiting to go out in this group, soonest first, with their text
//        opened. Leaders and admins of the group only; anyone else gets an empty list.
// POST /api/app/v1/one/groups/[id]/scheduled  { runAt, body?, attachmentId?, poll?, event?, mentions? }
//        Schedule one: a minute to 30 days ahead, text, a photo, a poll or an event card
//        (no voice notes or videos). Nothing is sent now; the every-minute job
//        (/api/cron/destiny-one-scheduled-jobs) sends it, re-checking the group and the
//        leader at that moment. 25 waiting per group.

export const dynamic = "force-dynamic";

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  const membership = await requireGroupMembership(caller, id);
  return oneJson(await listScheduledMessages(caller, id, membership));
});

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  await limit("schedule", caller.member.id, 30);
  const membership = await requireGroupMembership(caller, id);
  const input = await readBody(request, scheduleMessageSchema);
  return oneJson(await createScheduledMessage(caller, id, membership, input), 201);
});
