import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { MEDIA_BUCKET, blockedIds, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { OneError, UUID_RE, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { uploadSchema } from "@/lib/destinyOne/schemas";

// GET  /api/app/v1/one/groups/[id]/attachments?ids=<uuid>,<uuid>…
//
// Fresh signed links for attachments the app already has cached. Links last
// an hour, but the app keeps messages for up to 30 days, so it asks here when
// a cached link has expired. Only files you could see in the chat: this
// group, sent since you joined, not deleted, not from someone you've blocked.
//
// POST /api/app/v1/one/groups/[id]/attachments  { mimeType, sizeBytes }
//
// Hands out a one-time signed upload URL into the private d1-chat-media bucket
// at <group>/<attachment id>. The app uploads the file there, then sends a
// message with `attachmentId`. Images and PDFs only, 20 MB max — the bucket
// enforces the same limits, so a client that lies here is refused on upload.
// The app should strip photo location metadata (EXIF GPS) before uploading.

export const dynamic = "force-dynamic";

const MAX_IDS = 60;
const SIGNED_URL_TTL = 60 * 60;

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  await limit("attachment-urls", caller.member.id, 60);
  const ids = [...new Set((new URL(request.url).searchParams.get("ids") ?? "").split(",").filter((x) => UUID_RE.test(x)))].slice(0, MAX_IDS);
  if (ids.length === 0) return oneJson({ urls: [] as { id: string; url: string | null }[] });

  const [membership, blocked] = await Promise.all([requireGroupMembership(caller, id), blockedIds(caller.member.id)]);
  const supabase = createServiceClient();
  let query = supabase
    .from("d1_messages")
    .select("attachment:d1_attachments!d1_messages_attachment_id_fkey!inner(id, storage_path)")
    .eq("group_id", id)
    .gte("created_at", membership.joinedAt)
    .is("deleted_at", null)
    .in("attachment_id", ids);
  if (blocked.length) query = query.or(`sender_id.is.null,sender_id.not.in.(${blocked.join(",")})`);
  const { data, error } = await query;
  if (error) throw new OneError("unavailable", "Couldn't refresh those files. Please try again.");

  const files = (data ?? []).map((r) => r.attachment as unknown as { id: string; storage_path: string });
  if (files.length === 0) return oneJson({ urls: [] as { id: string; url: string | null }[] });
  const signed = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(
    files.map((f) => f.storage_path),
    SIGNED_URL_TTL,
  );
  const urlFor = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));
  return oneJson({ urls: files.map((f) => ({ id: f.id, url: urlFor.get(f.storage_path) ?? null })) });
});

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  await limit("upload", caller.member.id, 20);
  const membership = await requireGroupMembership(caller, id);
  if (membership.state !== "active") {
    throw new OneError("rule_violation", "This group is paused and read-only for now.");
  }
  const { mimeType, sizeBytes } = await readBody(request, uploadSchema);

  const attachmentId = randomUUID();
  const path = `${id}/${attachmentId}`;
  const supabase = createServiceClient();

  const signed = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data) throw new OneError("unavailable", "Uploads aren't available right now.");

  const { error } = await supabase.from("d1_attachments").insert({
    id: attachmentId,
    group_id: id,
    uploader_id: caller.member.id,
    storage_path: path,
    mime_type: mimeType,
    size_bytes: sizeBytes,
  });
  if (error) throw new OneError("unavailable", "Uploads aren't available right now.");

  return oneJson({ attachmentId, uploadUrl: signed.data.signedUrl, token: signed.data.token, path }, 201);
});
