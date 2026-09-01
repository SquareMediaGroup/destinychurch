import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { deleteAsset } from "@/lib/playbook.server";
import { hashPassword } from "@/lib/mediaAccess";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServiceClient();
  const before = await readForAudit("media_boards", id);

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = String(body.title).trim();
  if (body.slug !== undefined) update.slug = String(body.slug).trim().toLowerCase();
  if (body.description !== undefined) update.description = body.description || null;
  if (body.is_public !== undefined) update.is_public = Boolean(body.is_public);
  if (body.allow_uploads !== undefined) update.allow_uploads = Boolean(body.allow_uploads);
  if (body.cover_photo_id !== undefined) update.cover_photo_id = body.cover_photo_id || null;
  // Instantly invalidates a leaked link — the old token stops resolving.
  if (body.regenerate_token === true) update.share_token = randomBytes(16).toString("hex");
  // clear_password wins if both are somehow sent — an explicit "remove it"
  // should never be silently overridden by a stray password field.
  if (body.clear_password === true) update.password_hash = null;
  else if (typeof body.password === "string" && body.password.length > 0) {
    update.password_hash = hashPassword(body.password);
  }

  const { data, error } = await supabase
    .from("media_boards")
    .update(update)
    .eq("id", id)
    .select(
      "id, title, slug, description, cover_photo_id, is_public, share_token, allow_uploads, playbook_board_token, password_hash, created_at, updated_at",
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "update",
    section: "media",
    entity: "board",
    entityId: id,
    entityLabel: data.title,
    summary: `Edited the photo board "${data.title}"`,
    before,
    after: data,
    redactFields: ["password_hash"],
  });

  const { password_hash, ...board } = data;
  return NextResponse.json({ ...board, has_password: Boolean(password_hash) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("media_boards", id);

  const { data: photos } = await supabase
    .from("media_photos")
    .select("playbook_asset_token, is_imported")
    .eq("board_id", id);

  // Only hard-delete from Playbook the assets /media itself created
  // (uploads, is_imported=false). This board's Playbook board is NEVER
  // deleted here, and an imported photo's asset is never deleted either —
  // "import from Playbook" always points at a board that already existed
  // before /media referenced it (picked from Playbook's own board list, not
  // created by this app), commonly one with hundreds of the church's own
  // pre-existing photos. Deleting a /media board must only ever remove our
  // own reference to that content, never the content itself.
  await Promise.all(
    (photos ?? [])
      .filter((p) => p.playbook_asset_token && !p.is_imported)
      .map((p) => deleteAsset(p.playbook_asset_token as string).catch(() => {})),
  );

  const { error } = await supabase.from("media_boards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "media",
    entity: "board",
    entityId: id,
    entityLabel: before?.title ? String(before.title) : null,
    summary: `Deleted the photo board "${before?.title ?? id}"`,
    before,
  });

  return NextResponse.json({ ok: true });
}
