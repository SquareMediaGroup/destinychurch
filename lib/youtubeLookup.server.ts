// Resolving a YouTube id to the two things a simulated broadcast needs: what
// it's called, and how long it runs. Shared by both lookup routes (which power
// the preview card on /admin/live and on /live itself) and by the save path,
// which re-resolves the runtime so a stale one can never be stored.

import "server-only";
import { getVideo, thumbUrl } from "@/lib/youtube";
import { parseIsoDurationSeconds } from "@/lib/simulatedLive";

export interface LookedUpVideo {
  videoId: string;
  title: string;
  durationSeconds: number | null;
  thumbnail: string;
  publishedAt: string;
}

/**
 * Null when the video can't be read — a bad id, a private upload, no API key,
 * or exhausted quota. The caller decides what that means: the lookup routes
 * report it, the save path falls back to the runtime that was typed in.
 */
export async function lookupVideo(videoId: string): Promise<LookedUpVideo | null> {
  const video = await getVideo(videoId);
  if (!video) return null;

  return {
    videoId,
    title: video.title,
    durationSeconds: parseIsoDurationSeconds(video.duration),
    thumbnail: thumbUrl(videoId),
    publishedAt: video.publishedAt,
  };
}
