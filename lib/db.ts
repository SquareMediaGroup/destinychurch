import { getSupabaseAdmin } from "./supabase";
import { Sermon } from "./types";

type SermonRow = {
  id: string;
  title: string;
  date: string;
  youtube_video_id?: string;
  youtube_pub_date?: string;
  podcast_guid?: string;
  podcast_pub_date?: string;
  podcast_audio_url?: string;
  thumbnail_url?: string;
  summary?: string;
  transcript?: string;
};

const mapRowToSermon = (row: SermonRow): Sermon => ({
  id: row.id,
  title: row.title,
  date: row.date,
  speaker: "Destiny Church",
  youtubeVideoId: row.youtube_video_id ?? undefined,
  youtubePubDate: row.youtube_pub_date ?? undefined,
  podcastGuid: row.podcast_guid ?? undefined,
  podcastPubDate: row.podcast_pub_date ?? undefined,
  podcastAudioUrl: row.podcast_audio_url ?? undefined,
  thumbnailUrl: row.thumbnail_url || "/destiny-logo.svg",
  summary: row.summary ?? undefined,
  transcript: row.transcript ?? undefined,
});

export async function saveSermon(sermon: Sermon) {
  const supabase = getSupabaseAdmin();
  let targetId = sermon.id;

  // If a sermon with this podcast guid already exists, reuse its id to avoid unique constraint conflicts.
  if (sermon.podcastGuid) {
    const { data: existing } = await supabase
      .from("sermons")
      .select("id")
      .eq("podcast_guid", sermon.podcastGuid)
      .maybeSingle();
    if (existing?.id) {
      targetId = existing.id as string;
    }
  }

  const { error } = await supabase
    .from("sermons")
    .upsert(
      {
        id: targetId,
        title: sermon.title,
        date: sermon.date,
        youtube_video_id: sermon.youtubeVideoId,
        youtube_pub_date: sermon.youtubePubDate,
        podcast_guid: sermon.podcastGuid,
        podcast_pub_date: sermon.podcastPubDate,
        podcast_audio_url: sermon.podcastAudioUrl,
        thumbnail_url: sermon.thumbnailUrl,
        summary: sermon.summary,
        transcript: sermon.transcript,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .throwOnError();

  if (error) throw error;
}

export async function getSermonById(id: string): Promise<Sermon | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sermons")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRowToSermon(data as SermonRow);
}

export async function getSermonByYoutubeId(
  youtubeId: string,
): Promise<Sermon | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sermons")
    .select("*")
    .eq("youtube_video_id", youtubeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRowToSermon(data as SermonRow);
}

export async function listSermons(limit = 25): Promise<Sermon[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sermons")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];
  return (data as SermonRow[]).map(mapRowToSermon);
}
