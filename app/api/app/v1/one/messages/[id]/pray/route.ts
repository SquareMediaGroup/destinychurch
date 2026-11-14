import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { blockedIds, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, requireMessageId, type IdParams } from "@/lib/destinyOne/http";

// POST   /api/app/v1/one/messages/[id]/pray  — "I prayed" on a prayer request (not your own)
// DELETE /api/app/v1/one/messages/[id]/pray  — take it back
// GET    /api/app/v1/one/messages/[id]/pray  — who prayed (current members of the group)
//
// d1_pray checks who can and tells the group the new count (never who). A tap
// notifies nobody; the person who asked can opt in to one summary a day.

export const dynamic = "force-dynamic";

async function pray(request: Request, params: Promise<{ id: string }>, on: boolean) {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  await limit("pray", caller.member.id, 60);
  const { data, error } = await createServiceClient().rpc("d1_pray", { p_actor: caller.member.id, p_message: id, p_on: on });
  if (error) throw fromDbError(error);
  return oneJson({ count: Number(data) });
}

export const POST = oneRoute<IdParams>((request, { params }) => pray(request, params, true));
export const DELETE = oneRoute<IdParams>((request, { params }) => pray(request, params, false));

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  await limit("prayed-by", caller.member.id, 60);

  const supabase = createServiceClient();
  const { data: request_, error } = await supabase.from("d1_prayer_requests").select("group_id").eq("message_id", id).maybeSingle();
  if (error) throw fromDbError(error);
  if (!request_) throw new OneError("not_found", "That prayer request doesn't exist.");
  // Only people in the group see who prayed, and not anyone they've blocked.
  await requireGroupMembership(caller, request_.group_id as string);

  const [{ data: taps, error: tapError }, blocked] = await Promise.all([
    supabase.from("d1_prayer_taps").select("member_id, created_at, d1_members!inner(display_name)").eq("message_id", id).order("created_at"),
    blockedIds(caller.member.id),
  ]);
  if (tapError) throw fromDbError(tapError);
  const people = (taps ?? [])
    .filter((t) => !blocked.includes(t.member_id as string))
    .map((t) => ({ id: t.member_id as string, displayName: (t.d1_members as unknown as { display_name: string }).display_name }));
  return oneJson({ people });
});
