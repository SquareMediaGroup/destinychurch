import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { readSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/groups/[id]/read  { messageId }
//
// Moves my read marker forward (never back). It drives my unread counts and,
// if I share read receipts (on by default), the "Seen by" list on messages
// (d1_read_receipts, 20261006_04). The chat list's peek never calls this.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  const { messageId } = await readBody(request, readSchema);

  // The marker must name a real message in this group. Any bigint used to be
  // accepted, so a marker set past the newest id made every later message
  // read as "Seen" in d1_read_receipts before it was ever opened.
  const { data: message } = await createServiceClient()
    .from("d1_messages")
    .select("id")
    .eq("id", messageId)
    .eq("group_id", id)
    .maybeSingle();
  if (!message) return oneJson({ ok: true as const });

  await createServiceClient()
    .from("d1_group_members")
    .update({ last_read_message_id: messageId })
    .eq("group_id", id)
    .eq("member_id", caller.member.id)
    .is("left_at", null)
    .or(`last_read_message_id.is.null,last_read_message_id.lt.${messageId}`);

  return oneJson({ ok: true as const });
});
