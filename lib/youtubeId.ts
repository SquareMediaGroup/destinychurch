// Pull an 11-character YouTube video id out of whatever a person pasted: a bare
// id, a watch URL, youtu.be, or /live|/embed|/shorts|/v paths. Client-safe.

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (VIDEO_ID.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const isYouTube =
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "youtu.be";
  if (!isYouTube) return null;

  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && VIDEO_ID.test(id) ? id : null;
  }

  const v = url.searchParams.get("v");
  if (v && VIDEO_ID.test(v)) return v;

  const segments = url.pathname.split("/").filter(Boolean);
  // /live/<id>, /embed/<id>, /shorts/<id>, /v/<id>
  const prefixed = ["live", "embed", "shorts", "v"];
  if (segments.length >= 2 && prefixed.includes(segments[0].toLowerCase())) {
    const id = segments[1];
    return VIDEO_ID.test(id) ? id : null;
  }

  return null;
}

/**
 * Where "Watch live" sends people now the on-site /live page is gone: the
 * current broadcast when we know its id, otherwise the channel's live tab
 * (which YouTube resolves to whatever is on air). Matches CHANNEL_VANITY in
 * lib/youtube.ts, repeated here so client components needn't import that file.
 */
export const YOUTUBE_CHANNEL_LIVE_URL = "https://www.youtube.com/destinychurchteesvalley/live";

export function youtubeWatchUrl(videoId: string | null | undefined): string {
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : YOUTUBE_CHANNEL_LIVE_URL;
}
