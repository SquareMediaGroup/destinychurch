import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { getPlaylistSnippet } from "@/lib/youtube";
import { getSermonSeriesRows } from "@/lib/sermonSeries.server";

// Sermon series admin — add/list YouTube playlists that become series filters
// on the public /sermons page. See supabase/migrations/20260920_01_sermon_series.sql
// and lib/sermonSeries.server.ts for the read side.

/** Pulls a playlist id out of a pasted YouTube URL, or returns the trimmed input as-is. */
function extractPlaylistId(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const listParam = url.searchParams.get("list");
    if (listParam) return listParam;
  } catch {
    // Not a URL — treat the whole trimmed input as a bare id.
  }
  return trimmed;
}

export async function GET() {
  const rows = await getSermonSeriesRows();
  const resolved = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      snippet: await getPlaylistSnippet(row.playlistId),
    }))
  );
  return NextResponse.json(resolved);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = String(body?.input ?? "").trim();
  if (!input) {
    return NextResponse.json({ error: "A playlist id or URL is required" }, { status: 400 });
  }

  const playlistId = extractPlaylistId(input);
  const snippet = await getPlaylistSnippet(playlistId);
  if (!snippet) {
    return NextResponse.json(
      { error: "That playlist couldn't be found — check the id or URL and that it's public" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sermon_series")
    .insert({ playlist_id: playlistId })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That playlist is already added" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAudit({
    action: "create",
    section: "sermons",
    entity: "sermon series",
    entityId: playlistId,
    entityLabel: snippet.title,
    summary: `Added the sermon series “${snippet.title}”`,
    after: { playlist_id: playlistId, title: snippet.title },
  });

  return NextResponse.json({ ...data, snippet }, { status: 201 });
}
