// POST   /api/app/v1/one/groups/[id]/icon — set/replace the group's icon
// DELETE /api/app/v1/one/groups/[id]/icon — remove it
//
// Any current member can change it (not just admins), so a group can pick its
// own picture without waiting on a leader. The file goes in the same private
// bucket as profile pictures, keyed by group id, and the row holds the path.
// Announcements keep their fixed megaphone icon, and a paused or archived
// group can't be edited.

import { createServiceClient } from "@/utils/supabase/service";
import { AVATAR_BUCKET, requireMember } from "@/lib/destinyOne/auth.server";
import { announceGroupUpdated, getGroup, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, requireUuid, type IdParams } from "@/lib/destinyOne/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's own limit
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

async function editableGroup(request: Request, params: IdParams["params"]) {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  const membership = await requireGroupMembership(caller, id);
  if (membership.kind === "announcements") {
    throw new OneError("rule_violation", "The Announcements group's icon can't be changed.");
  }
  if (membership.state !== "active") {
    throw new OneError("rule_violation", "This group is paused, so its icon can't be changed right now.");
  }
  return { caller, id };
}

async function currentPath(id: string): Promise<string | null> {
  const { data, error } = await createServiceClient().from("d1_groups").select("icon_path").eq("id", id).maybeSingle();
  if (error) throw fromDbError(error);
  return (data?.icon_path as string | null) ?? null;
}

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const { caller, id } = await editableGroup(request, params);
  await limit("group-icon", caller.member.id, 10);

  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) throw new OneError("invalid", "No file provided.");
  if (file.size > MAX_BYTES) throw new OneError("invalid", "Image exceeds 5MB limit.");
  if (!ALLOWED.has(file.type)) throw new OneError("invalid", "Please upload a JPEG, PNG, WebP or HEIC image.");

  const path = `group-${id}-${Date.now()}.${file.type.split("/")[1]}`;
  const supabase = createServiceClient();
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("⚠️ Destiny One group icon upload failed:", uploadError.message);
    throw new OneError("unavailable", "Couldn't save the icon. Please try again.");
  }

  const previous = await currentPath(id);
  const { error: updateError } = await supabase
    .from("d1_groups")
    .update({ icon_path: path, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    console.error("⚠️ Destiny One group icon update failed:", updateError.message);
    throw new OneError("unavailable", "Couldn't save the icon. Please try again.");
  }
  // Best-effort: a failure leaves an orphaned file, not a broken group.
  if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);

  await announceGroupUpdated(id);
  return oneJson(await getGroup(caller, id));
});

export const DELETE = oneRoute<IdParams>(async (request, { params }) => {
  const { caller, id } = await editableGroup(request, params);
  const previous = await currentPath(id);
  if (previous) {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("d1_groups")
      .update({ icon_path: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw fromDbError(error);
    await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
    await announceGroupUpdated(id);
  }
  return oneJson(await getGroup(caller, id));
});
