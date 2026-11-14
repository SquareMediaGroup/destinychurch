import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { OneError, limit, oneJson, oneRoute, requireUuid } from "@/lib/destinyOne/http";
import { runDueJobs } from "@/lib/destinyOne/scheduledJobs.server";
import { markSendNow } from "@/lib/destinyOne/scheduledSends.server";

// POST /api/app/v1/one/groups/[id]/scheduled/[jobId]/send
//        Send a scheduled message now. Makes it due and runs the due jobs, so it goes out
//        straight away rather than at the next minute. It is still checked as if typed now.

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; jobId: string }> };

export const POST = oneRoute<Params>(async (request, { params }) => {
  const caller = await requireMember(request);
  const { id: groupParam, jobId } = await params;
  const id = requireUuid(groupParam, "group");
  await limit("schedule", caller.member.id, 30);
  const membership = await requireGroupMembership(caller, id);
  const n = Number(jobId);
  if (!Number.isSafeInteger(n) || n <= 0) throw new OneError("not_found", "That scheduled message doesn't exist.");
  await markSendNow(caller, id, membership, n);
  await runDueJobs();
  // A job that can't be sent (the group was paused a moment ago, say) cancels itself with the reason.
  const { data } = await createServiceClient().from("d1_scheduled_jobs").select("status, last_error").eq("id", n).maybeSingle();
  if (data?.status === "cancelled" && data.last_error) throw new OneError("rule_violation", `It wasn't sent. ${data.last_error}`);
  return oneJson({ ok: true as const });
});
