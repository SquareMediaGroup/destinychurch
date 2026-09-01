import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { requestPermalink, getAsset } from "@/lib/playbook.server";

const MAX_PER_REQUEST = 100;

/**
 * Brings hand-picked assets from an existing Playbook board into /media as
 * already-approved photos — these were never anonymous public uploads, so
 * there's nothing to moderate. Deliberately selection-based rather than
 * "import the whole board": a board like the church's existing 660-photo
 * "Sunday Services" board is not something you'd want to dump onto a public
 * page wholesale.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { playbookBoardToken, assetTokens } = body as {
    playbookBoardToken?: string;
    assetTokens?: string[];
  };

  if (!playbookBoardToken || typeof playbookBoardToken !== "string") {
    return NextResponse.json({ error: "playbookBoardToken is required" }, { status: 400 });
  }
  if (!Array.isArray(assetTokens) || assetTokens.length === 0) {
    return NextResponse.json({ error: "Select at least one photo" }, { status: 400 });
  }
  if (assetTokens.length > MAX_PER_REQUEST) {
    return NextResponse.json({ error: `Import at most ${MAX_PER_REQUEST} at a time` }, { status: 422 });
  }

  const supabase = createServiceClient();

  // Resolve the target /media board: either a fresh one built to mirror this
  // Playbook board, or an existing one an earlier import already linked to
  // it. Either way the link is playbookBoardToken <-> media_boards row, so a
  // second import into the same target reuses it rather than duplicating it.
  let boardId: string;
  let boardTitle: string;
  if (body.newBoard) {
    const { title, slug, is_public } = body.newBoard as {
      title?: string;
      slug?: string;
      is_public?: boolean;
    };
    if (!title || !slug) {
      return NextResponse.json({ error: "title and slug are required" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("media_boards")
      .insert({
        title: String(title).trim(),
        slug: String(slug).trim().toLowerCase(),
        is_public: is_public !== false,
        playbook_board_token: playbookBoardToken,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    boardId = data.id;
    boardTitle = data.title;
  } else if (body.existingBoardId) {
    const { data: existing } = await supabase
      .from("media_boards")
      .select("id, title, playbook_board_token")
      .eq("id", body.existingBoardId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "Board not found" }, { status: 404 });
    if (existing.playbook_board_token && existing.playbook_board_token !== playbookBoardToken) {
      return NextResponse.json(
        { error: "This board is already linked to a different Playbook board" },
        { status: 409 },
      );
    }
    if (!existing.playbook_board_token) {
      await supabase
        .from("media_boards")
        .update({ playbook_board_token: playbookBoardToken })
        .eq("id", existing.id);
    }
    boardId = existing.id;
    boardTitle = existing.title;
  } else {
    return NextResponse.json({ error: "newBoard or existingBoardId is required" }, { status: 400 });
  }

  // Skip anything already imported (e.g. re-opening a board picked over
  // before) rather than creating a duplicate media_photos row for it.
  const { data: alreadyImported } = await supabase
    .from("media_photos")
    .select("playbook_asset_token")
    .in("playbook_asset_token", assetTokens);
  const skip = new Set((alreadyImported ?? []).map((r) => r.playbook_asset_token));
  const toImport = assetTokens.filter((t) => !skip.has(t));

  const actorEmail = (await headers()).get(AUDIT_ACTOR_HEADERS.email) || null;
  const now = new Date().toISOString();

  const results = await Promise.allSettled(
    toImport.map(async (assetToken) => {
      try {
        const asset = await getAsset(assetToken);
        // A group (Playbook's "similar photos" clustering) has no image of
        // its own — the picker UI already disables these, but a client could
        // still send one, and add_permalinks "succeeds" on a group token
        // while returning permalink: null, which would otherwise surface as
        // an unexplained failure downstream.
        if (asset.is_group) {
          throw new Error(`"${asset.title}" is a group of photos, not a single photo — open it in Playbook and select the individual photos inside instead.`);
        }
        // Reuse an existing permalink (e.g. this photo was already shared
        // externally before /media existed) rather than requesting a new
        // one — add_permalinks 406s on an asset that already has one.
        const permalink = asset.permalink ?? (await requestPermalink(assetToken));
        const { error } = await supabase.from("media_photos").insert({
          board_id: boardId,
          file_name: asset.title || "Untitled",
          mime_type: asset.media_type,
          size_bytes: asset.size ?? null,
          width: asset.primary_width ?? null,
          height: asset.primary_height ?? null,
          uploader_name: asset.uploaded_by?.name || "Imported from Playbook",
          status: "approved",
          reviewed_by: actorEmail,
          reviewed_at: now,
          playbook_asset_token: assetToken,
          playbook_permalink_url: permalink,
          // This asset pre-dates /media (it's real, pre-existing Playbook
          // content) — deleting this row must never delete it from Playbook.
          // See app/api/admin/media/photos/[id]/route.ts and boards/[id]/route.ts.
          is_imported: true,
        });
        if (error) throw new Error(error.message);
      } catch (err) {
        console.error(`⚠️ Import failed for Playbook asset ${assetToken}:`, err);
        throw err;
      }
    }),
  );

  const imported = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - imported;

  await recordAudit({
    action: "upload",
    section: "media",
    entity: "photo",
    entityId: boardId,
    entityLabel: boardTitle,
    summary: `Imported ${imported} photo${imported === 1 ? "" : "s"} from Playbook into "${boardTitle}"${failed ? ` (${failed} failed)` : ""}${skip.size ? ` — ${skip.size} already imported, skipped` : ""}`,
    metadata: { playbookBoardToken, requested: assetTokens.length, imported, failed, skipped: skip.size },
  });

  return NextResponse.json({ imported, failed, skipped: skip.size, boardId });
}
