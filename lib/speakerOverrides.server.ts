import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import * as rawYoutube from "@/lib/youtube";
import type { YTVideo, UploadedVideosPage } from "@/lib/youtube";

// Speaker-corrected wrappers around lib/youtube.ts.
//
// lib/sermonTitle.ts's regex parse gets current, well-formatted titles right
// but produces noise on years of inconsistent older ones. lib/speakerReview.server.ts
// (triggered from /admin/sermons) reviews videos with AI and stores corrections
// in the speaker_overrides table; this file is where every video-serving path
// should read from instead of lib/youtube.ts directly, so a correction takes
// effect everywhere at once. lib/youtube.ts itself stays a pure YouTube API
// client with no Supabase dependency.
//
// A row with speaker = null is a *confirmed* "no individual speaker", distinct
// from no row (not yet reviewed) — so an override only ever replaces a value,
// never removes a perfectly good regex-parsed speaker that just hasn't been
// looked at yet.

async function fetchOverrides(ids: string[]): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("speaker_overrides")
    .select("video_id, speaker")
    .in("video_id", ids);
  return new Map((data ?? []).map((r) => [r.video_id as string, r.speaker as string | null]));
}

export type SpeakerOverrideRow = {
  speaker: string | null;
  /** "ai" (batch review) or "admin" (manual edit) — see app/api/admin/sermons/speaker/route.ts. */
  reviewedBy: string;
};

/** Raw override rows, keyed by video id — for the admin editor's revert/source badge, not the public read path (which only needs the speaker value, via fetchOverrides above). */
export async function getSpeakerOverrides(ids: string[]): Promise<Map<string, SpeakerOverrideRow>> {
  if (ids.length === 0) return new Map();
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("speaker_overrides")
    .select("video_id, speaker, reviewed_by")
    .in("video_id", ids);
  return new Map(
    (data ?? []).map((r) => [
      r.video_id as string,
      { speaker: r.speaker as string | null, reviewedBy: r.reviewed_by as string },
    ])
  );
}

function applyOverrides(videos: YTVideo[], overrides: Map<string, string | null>): YTVideo[] {
  if (overrides.size === 0) return videos;
  return videos.map((v) => (overrides.has(v.id) ? { ...v, speaker: overrides.get(v.id)! } : v));
}

export async function getFullSermonArchive(): Promise<YTVideo[]> {
  const videos = await rawYoutube.getFullSermonArchive();
  const overrides = await fetchOverrides(videos.map((v) => v.id));
  return applyOverrides(videos, overrides);
}

export async function getUploadedVideos(pageToken?: string): Promise<UploadedVideosPage> {
  const page = await rawYoutube.getUploadedVideos(pageToken);
  const overrides = await fetchOverrides(page.videos.map((v) => v.id));
  return { ...page, videos: applyOverrides(page.videos, overrides) };
}

export async function getVideo(id: string): Promise<YTVideo | null> {
  const video = await rawYoutube.getVideo(id);
  if (!video) return null;
  const overrides = await fetchOverrides([id]);
  return applyOverrides([video], overrides)[0];
}

export async function getLatestVideo(): Promise<YTVideo | null> {
  const video = await rawYoutube.getLatestVideo();
  if (!video) return null;
  const overrides = await fetchOverrides([video.id]);
  return applyOverrides([video], overrides)[0];
}

export async function getAllVideos(maxResults = 200): Promise<YTVideo[]> {
  const videos = await rawYoutube.getAllVideos(maxResults);
  const overrides = await fetchOverrides(videos.map((v) => v.id));
  return applyOverrides(videos, overrides);
}
