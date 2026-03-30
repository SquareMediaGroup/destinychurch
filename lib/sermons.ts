import { createServiceClient } from "@/utils/supabase/service";
import { getAllVideos, getLatestVideo, getVideo, type YTVideo } from "@/lib/youtube";

// Temporary override: video knocked out of YouTube search index after takedown/restore.
// Remove once the next livestream is uploaded and appears normally.
const PINNED_VIDEO_ID = "cMPdYeLDjLY";

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
  const [videos, hidden, pinned] = await Promise.all([
    getAllVideos(maxResults),
    getHiddenIds(),
    PINNED_VIDEO_ID ? getVideo(PINNED_VIDEO_ID) : Promise.resolve(null),
  ]);
  const filtered = videos.filter((v) => !hidden.has(v.id));
  if (pinned && !hidden.has(pinned.id) && !filtered.some((v) => v.id === pinned.id)) {
    filtered.unshift(pinned);
  }
  return filtered;
}

export async function getLatestVisibleVideo(): Promise<YTVideo | null> {
  const [video, hidden, pinned] = await Promise.all([
    getLatestVideo(),
    getHiddenIds(),
    PINNED_VIDEO_ID ? getVideo(PINNED_VIDEO_ID) : Promise.resolve(null),
  ]);
  if (pinned && !hidden.has(pinned.id)) return pinned;
  if (!video || hidden.has(video.id)) return null;
  return video;
}
