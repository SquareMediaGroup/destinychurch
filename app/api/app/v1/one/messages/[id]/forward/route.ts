import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { canPost, contentPreview, type D1Message, type D1MessageContent } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { MEDIA_BUCKET, broadcastNewMessage, getMessage, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { messageTerms, openBody, openContent, sealBody, sealContent } from "@/lib/destinyOne/crypto.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody, requireMessageId, type IdParams } from "@/lib/destinyOne/http";
import { attachLinkPreview } from "@/lib/destinyOne/linkPreview.server";
import { pushNewMessage } from "@/lib/destinyOne/push.server";
import { forwardSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/messages/[id]/forward  { groupIds: uuid[] (1–5) }
//
// Sends a copy of a message into other groups I'm in, marked "Forwarded".
// Each copy is a new message from me, so every posting rule of the target
// group applies (paused groups, Announcements), and it's pushed like any
// message. The text is opened and sealed again for each group (keys are per
// group), and a photo or PDF is copied into that group's own folder, so the
// copies never share a file with the original. forwarded_from keeps the link
// for safeguarding review; d1_post_message refuses a message I can't see.
// Polls can't be forwarded (their votes belong to the original group).

export const dynamic = "force-dynamic";

interface SourceRow {
  id: number;
  group_id: string;
  body: string | null;
  content: D1MessageContent | null;
  deleted_at: string | null;
  attachment: { id: string; storage_path: string; mime_type: string; size_bytes: number | null; duration_ms: number | null } | null;
}

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  await limit("forward", caller.member.id, 20);
  const { groupIds } = await readBody(request, forwardSchema);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("d1_messages")
    .select("id, group_id, body, content, deleted_at, attachment:d1_attachments!d1_messages_attachment_id_fkey(id, storage_path, mime_type, size_bytes, duration_ms)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw fromDbError(error);
  const src = data as unknown as SourceRow | null;
  if (!src || src.deleted_at) throw new OneError("not_found", "That message doesn't exist.");
  // Seeing it is checked again in SQL; this is for a friendlier error first.
  await requireGroupMembership(caller, src.group_id);
  if (src.content?.kind === "poll") throw new OneError("rule_violation", "Polls can't be forwarded.");

  const body = openBody(src.body, src.group_id);
  const content = openContent(src.content, src.group_id);
  const sent: D1Message[] = [];

  for (const target of [...new Set(groupIds)].filter((g) => g !== src.group_id)) {
    const membership = await requireGroupMembership(caller, target);
    if (!canPost({ member: caller.policy, groupKind: membership.kind, groupState: membership.state, myRole: membership.role })) {
      throw new OneError("rule_violation", membership.state !== "active" ? "One of those groups is paused and read-only for now." : "Only admins can post in Announcements.");
    }

    // The file, copied into the target group's folder with its own record.
    let attachmentId: string | null = null;
    if (src.attachment) {
      attachmentId = randomUUID();
      const path = `${target}/${attachmentId}`;
      const copied = await supabase.storage.from(MEDIA_BUCKET).copy(src.attachment.storage_path, path);
      if (copied.error) throw new OneError("unavailable", "Couldn't forward that file. Please try again.");
      const { error: rowError } = await supabase.from("d1_attachments").insert({
        id: attachmentId,
        group_id: target,
        uploader_id: caller.member.id,
        storage_path: path,
        mime_type: src.attachment.mime_type,
        size_bytes: src.attachment.size_bytes,
        duration_ms: src.attachment.duration_ms,
      });
      if (rowError) throw new OneError("unavailable", "Couldn't forward that file. Please try again.");
    }

    const { data: newId, error: postError } = await supabase.rpc("d1_post_message", {
      p_actor: caller.member.id,
      p_group: target,
      p_body: sealBody(body, target),
      p_attachment: attachmentId,
      p_content: sealContent(content, target),
      p_terms: messageTerms(body, target),
      p_forwarded_from: src.id,
    });
    if (postError) throw fromDbError(postError);

    const message = await getMessage(caller, newId as number);
    sent.push(message);
    after(() =>
      Promise.all([
        broadcastNewMessage(message),
        pushNewMessage(target, caller.member.id, { senderName: caller.member.display_name, body: body ?? contentPreview(content), attachmentMime: message.attachment?.mimeType ?? null }, [], message.id),
        attachLinkPreview(message.id, target, body),
      ]),
    );
  }

  return oneJson({ messages: sent }, 201);
});
