import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { deleteAsset, deleteBoard } from "@/lib/playbook.server";

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

  const { data, error } = await supabase
    .from("media_boards")
    .update(update)
    .eq("id", id)
    .select()
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
  });

  return NextResponse.json(data);
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
    .select("playbook_asset_token")
    .eq("board_id", id);

  // Assets are deleted individually rather than relying on the board delete
  // below to cascade — Playbook's API doesn't document whether it does, and
  // an explicit delete per asset guarantees full cleanup either way.
  await Promise.all(
    (photos ?? [])
      .filter((p) => p.playbook_asset_token)
      .map((p) => deleteAsset(p.playbook_asset_token as string).catch(() => {})),
  );
  if (before?.playbook_board_token) {
    await deleteBoard(before.playbook_board_token as string).catch(() => {});
  }

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
