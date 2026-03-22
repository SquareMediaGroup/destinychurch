import { createServiceClient } from "@/utils/supabase/service";
import { getAllVideos, getLatestVideo, type YTVideo } from "@/lib/youtube";

async function getHiddenIds(): Promise<Set<string>> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from("hidden_videos").select("video_id");
    return new Set((data ?? []).map((r: { video_id: string }) => r.video_id));
  } catch {
    return new Set();
  }
}

export async function getVisibleVideos(maxResults = 50): Promise<YTVideo[]> {
  const [videos, hidden] = await Promise.all([
    getAllVideos(maxResults),
    getHiddenIds(),
  ]);
  return videos.filter((v) => !hidden.has(v.id));
}

export async function getLatestVisibleVideo(): Promise<YTVideo | null> {
  const [video, hidden] = await Promise.all([
    getLatestVideo(),
    getHiddenIds(),
  ]);
  if (!video || hidden.has(video.id)) return null;
  return video;
}
