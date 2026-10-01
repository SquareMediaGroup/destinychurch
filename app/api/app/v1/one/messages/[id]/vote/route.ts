import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute, readBody, requireMessageId, type IdParams } from "@/lib/destinyOne/http";
import { voteSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/messages/[id]/vote  { optionIds }
//        Replaces the caller's vote(s) on a poll message with `optionIds`
//        (empty array clears their vote). The database enforces single choice
//        for polls that don't allow multiple, and that only current, active
//        group members can vote. Everyone else in the group receives the
//        fresh tally on the d1-group:<id> Realtime topic.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  await limit("vote", caller.member.id, 60);
  const { optionIds } = await readBody(request, voteSchema);

  const { error } = await createServiceClient().rpc("d1_vote", {
    p_actor: caller.member.id,
    p_message: id,
    p_option_ids: optionIds,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
});
