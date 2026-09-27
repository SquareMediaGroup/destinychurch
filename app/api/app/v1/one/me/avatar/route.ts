// POST   /api/app/v1/one/me/avatar — upload/replace my profile picture
// DELETE /api/app/v1/one/me/avatar — remove it
//
// Unlike display_name (locked to the ChurchSuite sync, see 20260926_01), a
// member's photo is theirs to set. Every write is keyed off the caller's own
// member.id from authenticate()+loadMemberByAuthUser() — never a
// client-supplied id — so a request can only ever replace or remove its own
// avatar.

import { createServiceClient } from "@/utils/supabase/service";
import { authenticate, loadMemberByAuthUser, toMe } from "@/lib/destinyOne/auth.server";
import { OneError, oneJson, oneRoute } from "@/lib/destinyOne/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "d1-avatars";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches the bucket's own limit
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export const POST = oneRoute(async (request) => {
  const user = await authenticate(request);
  const member = await loadMemberByAuthUser(user.id);
  if (!member) throw new OneError("not_verified", "Finish signing in first.");

  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    throw new OneError("invalid", "No file provided.");
  }
  if (file.size > MAX_BYTES) {
    throw new OneError("invalid", "Image exceeds 5MB limit.");
  }
  if (!ALLOWED.has(file.type)) {
    throw new OneError("invalid", "Please upload a JPEG, PNG, WebP or HEIC image.");
  }

  const ext = file.type.split("/")[1];
  const path = `${member.id}-${Date.now()}.${ext}`;
  const supabase = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) throw new OneError("unavailable", uploadError.message);

  const previous = member.avatar_url;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error: updateError } = await supabase
    .from("d1_members")
    .update({ avatar_url: data.publicUrl })
    .eq("id", member.id);
  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new OneError("unavailable", updateError.message);
  }

  // Best-effort cleanup of the old file — a failure here leaves an orphaned
  // object in the bucket, not a broken profile, so it isn't awaited-critical.
  if (previous) {
    const previousPath = previous.split(`${BUCKET}/`).pop();
    if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  return oneJson(await toMe({ ...member, avatar_url: data.publicUrl }));
});

export const DELETE = oneRoute(async (request) => {
  const user = await authenticate(request);
  const member = await loadMemberByAuthUser(user.id);
  if (!member) throw new OneError("not_verified", "Finish signing in first.");
  if (!member.avatar_url) return oneJson(await toMe(member));

  const supabase = createServiceClient();
  const path = member.avatar_url.split(`${BUCKET}/`).pop();

  const { error } = await supabase.from("d1_members").update({ avatar_url: null }).eq("id", member.id);
  if (error) throw new OneError("unavailable", error.message);

  if (path) await supabase.storage.from(BUCKET).remove([path]);

  return oneJson(await toMe({ ...member, avatar_url: null }));
});
