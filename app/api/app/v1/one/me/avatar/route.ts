// POST   /api/app/v1/one/me/avatar — upload/replace my profile picture
// DELETE /api/app/v1/one/me/avatar — remove it
//
// Unlike display_name (set by staff, see 20260926_01), a member's photo is
// theirs to set. Every write is keyed off the caller's own member.id from
// requireMember() — never a client-supplied id — so a request can only ever
// replace or remove its own picture. Only active members can set one.
//
// The d1-avatars bucket is private (20260928_01): d1_members.avatar_url holds
// the storage path, and toMe() hands the app a short-lived signed link.

import { createServiceClient } from "@/utils/supabase/service";
import { AVATAR_BUCKET, requireMember, toMe } from "@/lib/destinyOne/auth.server";
import { OneError, limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches the bucket's own limit
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export const POST = oneRoute(async (request) => {
  const { member } = await requireMember(request, { requireConsent: false });
  limit("avatar", member.id, 10);

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
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("⚠️ Destiny One avatar upload failed:", uploadError.message);
    throw new OneError("unavailable", "Couldn't save your picture. Please try again.");
  }

  const previous = member.avatar_url;
  const { error: updateError } = await supabase.from("d1_members").update({ avatar_url: path }).eq("id", member.id);
  if (updateError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    console.error("⚠️ Destiny One avatar update failed:", updateError.message);
    throw new OneError("unavailable", "Couldn't save your picture. Please try again.");
  }

  // Best-effort cleanup of the old file — a failure leaves an orphaned object
  // in the bucket, not a broken profile.
  if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);

  return oneJson(await toMe({ ...member, avatar_url: path }));
});

export const DELETE = oneRoute(async (request) => {
  const { member } = await requireMember(request, { requireConsent: false });
  if (!member.avatar_url) return oneJson(await toMe(member));

  const supabase = createServiceClient();
  const { error } = await supabase.from("d1_members").update({ avatar_url: null }).eq("id", member.id);
  if (error) {
    console.error("⚠️ Destiny One avatar removal failed:", error.message);
    throw new OneError("unavailable", "Couldn't remove your picture. Please try again.");
  }
  await supabase.storage.from(AVATAR_BUCKET).remove([member.avatar_url]);

  return oneJson(await toMe({ ...member, avatar_url: null }));
});
