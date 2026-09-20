import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { getPlaylistSnippet, getPlaylistVideoIds } from "@/lib/youtube";

// Sermon series — admin-curated YouTube playlists, read the same way
// lib/speakerOverrides.server.ts reads speaker corrections: the DB only ever
// holds a pointer (here, a playlist_id), everything else comes live from
// YouTube. See supabase/migrations/20260920_01_sermon_series.sql.

export type SermonSeriesRow = {
  playlistId: string;
  addedBy: string | null;
  sortOrder: number;
  createdAt: string;
};

export type SermonSeries = {
  id: string;
  title: string;
  description: string;
  videoIds: string[];
};

/** Raw DB rows only, no YouTube calls — used by the admin list so a since-removed/private playlist still shows up and can be deleted. */
export async function getSermonSeriesRows(): Promise<SermonSeriesRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sermon_series")
    .select("playlist_id, added_by, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []).map((r) => ({
    playlistId: r.playlist_id as string,
    addedBy: r.added_by as string | null,
    sortOrder: r.sort_order as number,
    createdAt: r.created_at as string,
  }));
}

/**
 * Every configured series, resolved against YouTube. A playlist that fails to
 * resolve (deleted, made private) is silently dropped — same fail-open
 * posture as getGuestSpeakerVideoIds, so one bad playlist never breaks the
 * public /sermons page.
 */
export async function getSermonSeriesList(): Promise<SermonSeries[]> {
  const rows = await getSermonSeriesRows();
  if (rows.length === 0) return [];

  const resolved = await Promise.all(
    rows.map(async (row): Promise<SermonSeries | null> => {
      const [snippet, videoIds] = await Promise.all([
        getPlaylistSnippet(row.playlistId),
        getPlaylistVideoIds(row.playlistId),
      ]);
      if (!snippet) return null;
      return {
        id: row.playlistId,
        title: snippet.title,
        description: snippet.description,
        videoIds: [...videoIds],
      };
    })
  );

  return resolved.filter((s): s is SermonSeries => s !== null);
}
