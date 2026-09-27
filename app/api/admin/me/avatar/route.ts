import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";

export const runtime = "nodejs";

const BUCKET = "admin-avatars";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches the bucket's own limit
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Every write here uses the service client, keyed off the caller's own
// auth_user_id from their session — never a client-supplied id — so a
// request can only ever replace or remove its own avatar.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const path = `${user.id}-${Date.now()}.${ext}`;
  const supabase = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from("admin_roles")
    .select("avatar_url")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const previous = existing?.avatar_url as string | null | undefined;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error: updateError } = await supabase
    .from("admin_roles")
    .update({ avatar_url: data.publicUrl })
    .eq("auth_user_id", user.id);
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

  await recordAudit({
    action: "upload",
    section: "account",
    entity: "profile picture",
    entityId: user.id,
    entityLabel: user.email ?? user.id,
    summary: `${user.email ?? "An admin"} updated their profile picture`,
    changes: null,
  });

  return NextResponse.json({ avatar_url: data.publicUrl });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("admin_roles")
    .select("avatar_url")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const current = existing?.avatar_url as string | null | undefined;
  if (!current) return NextResponse.json({ success: true });

  const path = current.split(`${BUCKET}/`).pop();

  const { error } = await supabase
    .from("admin_roles")
    .update({ avatar_url: null })
    .eq("auth_user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (path) await supabase.storage.from(BUCKET).remove([path]);

  await recordAudit({
    action: "update",
    section: "account",
    entity: "profile picture",
    entityId: user.id,
    entityLabel: user.email ?? user.id,
    summary: `${user.email ?? "An admin"} removed their profile picture`,
    changes: null,
  });

  return NextResponse.json({ success: true });
}
