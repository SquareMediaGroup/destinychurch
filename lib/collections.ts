import { createServiceClient } from "@/utils/supabase/service";

export interface SermonCollection {
  id: string;
  type: "playlist" | "series" | "guest_speaker";
  title: string;
  description: string | null;
  youtube_playlist_id: string;
  thumbnail_url: string | null;
  display_order: number;
}

export async function getCollections(type: SermonCollection["type"]): Promise<SermonCollection[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sermon_collections")
    .select("id, type, title, description, youtube_playlist_id, thumbnail_url, display_order")
    .eq("type", type)
    .eq("active", true)
    .order("display_order", { ascending: true });
  return (data ?? []) as SermonCollection[];
}

export async function getAllCollections(): Promise<SermonCollection[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sermon_collections")
    .select("id, type, title, description, youtube_playlist_id, thumbnail_url, display_order")
    .eq("active", true)
    .order("display_order", { ascending: true });
  return (data ?? []) as SermonCollection[];
}

/** Check all series playlists for a video and return its series context */
export async function getSeriesForVideo(
  videoId: string
): Promise<{
  collection: SermonCollection;
  videos: import("@/lib/youtube").YTVideo[];
  currentIndex: number;
} | null> {
  const { getPlaylistVideos } = await import("@/lib/youtube");
  const series = await getCollections("series");
  for (const s of series) {
    const videos = await getPlaylistVideos(s.youtube_playlist_id, 50);
    const idx = videos.findIndex((v) => v.id === videoId);
    if (idx !== -1) {
      return { collection: s, videos, currentIndex: idx };
    }
  }
  return null;
}
