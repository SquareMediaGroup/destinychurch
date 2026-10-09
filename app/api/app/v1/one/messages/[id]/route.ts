import { after } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { broadcastMessageEdited, getMessage } from "@/lib/destinyOne/chat.server";
import { firstUrl } from "@/lib/destinyOne/linkPreview";
import { attachLinkPreview } from "@/lib/destinyOne/linkPreview.server";
import { messageTerms, sealBody } from "@/lib/destinyOne/crypto.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody, requireMessageId, type IdParams } from "@/lib/destinyOne/http";
import { editMessageSchema } from "@/lib/destinyOne/schemas";

// PATCH  /api/app/v1/one/messages/[id]  { body }
//
// Edit the text of my own message, within 15 minutes of sending (up to 10
// times). d1_edit_message enforces the rules and copies the text it replaces
// into d1_message_edits first, so the safeguarding transcript shows every
// version. The new text is sealed with fresh search terms, and everyone in
// the group gets it on d1-group:<id> as `message_edited`. No push: an edit
// isn't a new message.
//
// DELETE /api/app/v1/one/messages/[id]
//
// "Delete for everyone" — by the sender, or a group admin taking something
// down. Members stop seeing the content immediately; it is kept for
// safeguarding review until the retention purge. Works in a frozen group too:
// removing something should never be blocked.

export const dynamic = "force-dynamic";

export const PATCH = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  await limit("edit", caller.member.id, 20);
  const { body, mentions } = await readBody(request, editMessageSchema);

  // The group decides the key and the search terms, so look it up first.
  // Anyone else's message (or one that doesn't exist) fails the same way in SQL.
  const { data: row, error: lookupError } = await createServiceClient().from("d1_messages").select("group_id").eq("id", id).maybeSingle();
  if (lookupError) throw fromDbError(lookupError);
  if (!row) throw new OneError("not_found", "That message doesn't exist.");
  const groupId = row.group_id as string;

  const { error } = await createServiceClient().rpc("d1_edit_message", {
    p_actor: caller.member.id,
    p_message: id,
    p_body: sealBody(body, groupId),
    p_terms: messageTerms(body, groupId),
    p_mentions: mentions ?? null,
  });
  if (error) throw fromDbError(error);

  const message = await getMessage(caller, id);
  after(async () => {
    await broadcastMessageEdited(message);
    // The link changed (or went): the preview follows the new text.
    if (firstUrl(body) !== message.linkPreview?.url) await attachLinkPreview(id, groupId, body, { clearIfNone: true });
  });
  return oneJson(message);
});

export const DELETE = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request, { requireConsent: false });
  const id = requireMessageId((await params).id);

  const { error } = await createServiceClient().rpc("d1_delete_message", {
    p_actor: caller.member.id,
    p_message: id,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
});
