import "server-only";

// Publishes sermon audio to Buzzsprout. Video keeps going to YouTube the
// normal way (YouTube Studio, outside this app) — this only ever creates the
// audio episode. See https://github.com/Buzzsprout/buzzsprout-api.
//
// Buzzsprout's public RSS feed (lib/podcast.ts) is the only channel this app
// reads back through, and there's no documented guarantee the private API's
// `tags` field reaches public RSS output — so the YouTube pairing hint goes
// into `description` instead (confirmed to reach RSS as `<description>`),
// wrapped in an HTML comment lib/podcast.ts strips before display.

/** `<!--yt:VIDEO_ID-->` — read back by lib/podcast.ts's extractYouTubeIdHint. */
export function buildYouTubeHintComment(videoId: string): string {
  return `<!--yt:${videoId}-->`;
}

export interface CreateBuzzsproutEpisodeOptions {
  title: string;
  speaker: string | null;
  notes: string | null;
  audioFile: File;
  /** The matching YouTube video id, when known — enables exact pairing. */
  youtubeVideoId: string | null;
}

export interface BuzzsproutEpisode {
  id: number;
  audio_url: string;
  published_at: string;
}

export async function createBuzzsproutEpisode(
  opts: CreateBuzzsproutEpisodeOptions
): Promise<BuzzsproutEpisode> {
  const token = process.env.BUZZSPROUT_API_TOKEN;
  const podcastId = process.env.BUZZSPROUT_PODCAST_ID;
  if (!token || !podcastId) {
    throw new Error("Missing BUZZSPROUT_API_TOKEN or BUZZSPROUT_PODCAST_ID");
  }

  const descriptionParts = [
    opts.notes?.trim() || null,
    opts.speaker ? `Speaker: ${opts.speaker}` : null,
  ].filter((p): p is string => Boolean(p));
  if (opts.youtubeVideoId) descriptionParts.push(buildYouTubeHintComment(opts.youtubeVideoId));

  const form = new FormData();
  form.set("title", opts.title);
  form.set("description", descriptionParts.join("\n\n"));
  form.set("audio_file", opts.audioFile);

  const res = await fetch(`https://www.buzzsprout.com/api/${podcastId}/episodes.json`, {
    method: "POST",
    // No Content-Type — fetch sets the multipart boundary for a FormData body.
    headers: { Authorization: `Token token=${token}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Buzzsprout upload failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
