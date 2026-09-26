import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { MEDIA_BUCKET, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { OneError, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { uploadSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/groups/[id]/attachments  { mimeType, sizeBytes }
//
// Hands out a one-time signed upload URL into the private d1-chat-media bucket
// at <group>/<attachment id>. The app uploads the file there, then sends a
// message with `attachmentId`. Images and PDFs only, 20 MB max — the bucket
// enforces the same limits, so a client that lies here is refused on upload.
// The app should strip photo location metadata (EXIF GPS) before uploading.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  limit("upload", caller.member.id, 20);
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
