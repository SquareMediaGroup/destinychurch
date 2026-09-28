import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { blockedIds, MEDIA_BUCKET, requireGroupMembership, SIGNED_URL_TTL } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, requireMessageId, type IdParams } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/messages/[id]/attachment  →  { url }
//
// A fresh signed link for one message's file. Links from the message list
// expire after an hour, but the app keeps chats cached for much longer, so a
// photo in an older chat asks here when its link has run out. Same rules as
// reading the chat: a current member, a message from after you joined, not
// deleted, not from someone you've blocked.

export const dynamic = "force-dynamic";

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  limit("attachment-url", caller.member.id, 300);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("d1_messages")
    .select("group_id, sender_id, created_at, deleted_at, attachment:d1_attachments!d1_messages_attachment_id_fkey(storage_path)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw fromDbError(error);
  const attachment = data?.attachment as unknown as { storage_path: string } | null;
  if (!data || data.deleted_at || !attachment) throw new OneError("not_found", "That file isn't available.");

  const [membership, blocked] = await Promise.all([requireGroupMembership(caller, data.group_id), blockedIds(caller.member.id)]);
  if (data.created_at < membership.joinedAt || (data.sender_id && blocked.includes(data.sender_id))) {
    throw new OneError("not_found", "That file isn't available.");
  }

  const { data: signed, error: signError } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(attachment.storage_path, SIGNED_URL_TTL);
  if (signError || !signed) throw new OneError("not_found", "That file isn't available.");
  return oneJson({ url: signed.signedUrl });
});
