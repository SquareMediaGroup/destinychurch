import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";

export const runtime = "nodejs";

const BUCKET = "staff-avatars";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches the bucket's own limit
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Every write here uses the service client, keyed off the caller's own
// staff.id from readPortalUser() — never a client-supplied id — so a
// request can only ever replace or remove its own avatar.
export async function POST(request: Request) {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image exceeds 5MB limit" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Please upload a JPEG, PNG, WebP or GIF" }, { status: 400 });
  }

  const ext = file.type.split("/")[1];
  const path = `${identity.staff.id}-${Date.now()}.${ext}`;
  const supabase = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const previous = identity.staff.avatar_url;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error: updateError } = await supabase
    .from("hr_staff")
    .update({ avatar_url: data.publicUrl })
    .eq("id", identity.staff.id);
  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Best-effort cleanup of the old file — a failure here leaves an orphaned
  // object in the bucket, not a broken profile, so it isn't awaited-critical.
  if (previous) {
    const previousPath = previous.split(`${BUCKET}/`).pop();
    if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  return NextResponse.json({ avatar_url: data.publicUrl });
}

export async function DELETE() {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!identity.staff.avatar_url) return NextResponse.json({ success: true });

  const supabase = createServiceClient();
  const path = identity.staff.avatar_url.split(`${BUCKET}/`).pop();

  const { error } = await supabase
    .from("hr_staff")
    .update({ avatar_url: null })
    .eq("id", identity.staff.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (path) await supabase.storage.from(BUCKET).remove([path]);

  return NextResponse.json({ success: true });
}
