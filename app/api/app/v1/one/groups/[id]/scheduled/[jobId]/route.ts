import { requireMember } from "@/lib/destinyOne/auth.server";
import { requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { OneError, limit, oneJson, oneRoute, readBody, requireUuid } from "@/lib/destinyOne/http";
import { deleteScheduledMessage, updateScheduledMessage } from "@/lib/destinyOne/scheduledSends.server";
import { updateScheduledSchema } from "@/lib/destinyOne/schemas";

// PATCH  /api/app/v1/one/groups/[id]/scheduled/[jobId]  { runAt?, body?, poll?, mentions? }
//          Change a scheduled message that hasn't gone out: its time, text or poll.
// DELETE /api/app/v1/one/groups/[id]/scheduled/[jobId]
//          Cancel it. Leaders and admins of the group. Once it has been sent (or is being
//          sent), it is a normal message and these answer "already sent".

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; jobId: string }> };

function requireJobId(value: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new OneError("not_found", "That scheduled message doesn't exist.");
  return n;
}

export const PATCH = oneRoute<Params>(async (request, { params }) => {
  const caller = await requireMember(request);
  const { id: groupParam, jobId } = await params;
  const id = requireUuid(groupParam, "group");
  await limit("schedule", caller.member.id, 30);
  const membership = await requireGroupMembership(caller, id);
  const patch = await readBody(request, updateScheduledSchema);
  return oneJson(await updateScheduledMessage(caller, id, membership, requireJobId(jobId), patch));
});

export const DELETE = oneRoute<Params>(async (request, { params }) => {
  const caller = await requireMember(request);
  const { id: groupParam, jobId } = await params;
  const id = requireUuid(groupParam, "group");
  await limit("schedule", caller.member.id, 30);
  const membership = await requireGroupMembership(caller, id);
  await deleteScheduledMessage(caller, id, membership, requireJobId(jobId));
  return oneJson({ ok: true as const });
});
