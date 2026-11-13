import { after } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { announceGroupUpdated } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody, type IdParams } from "@/lib/destinyOne/http";
import { pushNotice } from "@/lib/destinyOne/push.server";
import { decideJoinSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/join-requests/[id]  { approve }
//        A leader of the group approves (the person is added, the normal way, so the
//        3-person / 2-adult rule still applies) or declines. Approval re-checks that the
//        person may still be added through Discover: an under-18 can never be approved
//        into a group that isn't marked suitable for under-18s. The person is told when
//        they're in; a decline is not announced (they see it in Discover, with when they
//        can ask again).

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const requestId = Number((await params).id);
  if (!Number.isSafeInteger(requestId) || requestId <= 0) throw new OneError("not_found", "That request doesn't exist.");
  await limit("join-decide", caller.member.id, 60);
  const { approve } = await readBody(request, decideJoinSchema);

  const supabase = createServiceClient();
  const { data: row } = await supabase.from("d1_join_requests").select("group_id").eq("id", requestId).maybeSingle();
  const { data: memberId, error } = await supabase.rpc("d1_decide_join_request", { p_actor: caller.member.id, p_request: requestId, p_approve: approve });
  if (error) throw fromDbError(error);

  const groupId = (row?.group_id as string | undefined) ?? null;
  if (approve && groupId) {
    after(async () => {
      const { data: group } = await supabase.from("d1_groups").select("name").eq("id", groupId).maybeSingle();
      await announceGroupUpdated(groupId);
      await pushNotice(memberId as string, (group?.name as string | undefined) ?? "Destiny One", "You're in. Say hello.", { groupId });
    });
  }
  return oneJson({ ok: true as const });
});
