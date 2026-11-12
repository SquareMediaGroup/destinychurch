import { after } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { broadcastToGroup } from "@/lib/destinyOne/chat.server";
import { sealBody } from "@/lib/destinyOne/crypto.server";
import { fromDbError, limit, oneJson, oneRoute, readBody, requireMessageId, type IdParams } from "@/lib/destinyOne/http";
import { pushNewMessage } from "@/lib/destinyOne/push.server";
import { answerPrayerSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/messages/[id]/answer  { update? }
//        Mark my own prayer request answered, with an optional short update (sealed).
//        Only the person who asked, once (d1_answer_prayer). The card changes to
//        Answered for everyone and the group gets a notification.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  await limit("answer-prayer", caller.member.id, 20);
  const { update } = await readBody(request, answerPrayerSchema);
  const text = update?.trim() || null;

  const supabase = createServiceClient();
  // The update is sealed for the request's own group, so that has to be known first.
  const { data: row, error: rowError } = await supabase.from("d1_prayer_requests").select("group_id").eq("message_id", id).maybeSingle();
  if (rowError) throw fromDbError(rowError);
  const groupId = (row?.group_id as string | undefined) ?? null;

  const { error } = await supabase.rpc("d1_answer_prayer", { p_actor: caller.member.id, p_message: id, p_update: groupId ? sealBody(text, groupId) : null });
  if (error) throw fromDbError(error);

  if (groupId) {
    after(() =>
      Promise.all([
        // Through the REST broadcast, which stores nothing: this carries the opened update.
        broadcastToGroup(groupId, "prayer_answered", { messageId: id, groupId, answeredAt: new Date().toISOString(), update: text }),
        pushNewMessage(groupId, caller.member.id, { senderName: caller.member.display_name, body: text ? `Prayer answered: ${text}` : "Prayer answered", attachmentMime: null }, [], id),
      ]),
    );
  }
  return oneJson({ ok: true as const });
});
