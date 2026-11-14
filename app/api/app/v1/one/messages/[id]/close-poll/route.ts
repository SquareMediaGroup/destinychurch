import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, requireMessageId, type IdParams } from "@/lib/destinyOne/http";
import { canClosePoll, closePollAndAnnounce } from "@/lib/destinyOne/scheduledSends.server";

// POST /api/app/v1/one/messages/[id]/close-poll
//        Close a poll now, before its deadline (or one with no deadline). The poll's
//        author, or a leader or admin of the group. Voting stops, the poll shows
//        Closed, and DestinyAI replies under it with the result. Closing twice is fine.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const messageId = requireMessageId((await params).id);
  await limit("close-poll", caller.member.id, 20);

  const { data, error } = await createServiceClient().from("d1_messages").select("group_id, sender_id, content").eq("id", messageId).is("deleted_at", null).maybeSingle();
  if (error) throw fromDbError(error);
  const row = data as { group_id: string; sender_id: string | null; content: { kind?: string } | null } | null;
  if (!row || row.content?.kind !== "poll") throw new OneError("not_found", "That poll doesn't exist.");

  const membership = await requireGroupMembership(caller, row.group_id);
  if (!canClosePoll(caller, membership, row.sender_id)) throw new OneError("forbidden", "Only the person who made the poll, or a leader or admin, can close it.");
  if (membership.state !== "active") throw new OneError("rule_violation", "This group is paused and read-only for now.");

  await closePollAndAnnounce(messageId, false);
  return oneJson({ ok: true as const });
});
