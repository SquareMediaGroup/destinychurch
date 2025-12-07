export type YoutubeVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
};

export async function fetchCompletedYoutubeVideos(
  channelId: string,
  apiKey: string,
  maxResults = 25,
  publishedAfter?: string,
): Promise<YoutubeVideo[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("type", "video");
  url.searchParams.set("eventType", "completed");
  url.searchParams.set("order", "date");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", apiKey);
  if (publishedAfter) {
    url.searchParams.set("publishedAfter", publishedAfter);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message ? ` - ${body.error.message}` : "";
    } catch {
      // ignore
    }
    throw new Error(`YouTube API error: ${res.status} ${res.statusText}${detail}`);
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .map((item: {
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        publishedAt?: string;
        thumbnails?: {
          default?: { url?: string };
          medium?: { url?: string };
          high?: { url?: string };
        };
      };
    }) => {
      const snippet = item?.snippet;
      const thumbnails = snippet?.thumbnails || {};
      const thumbnailUrl =
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        "";

      if (!item?.id?.videoId || !snippet?.title || !snippet?.publishedAt) {
        return null;
      }

      return {
        videoId: item.id.videoId,
        title: snippet.title,
        publishedAt: snippet.publishedAt,
        thumbnailUrl,
      } satisfies YoutubeVideo;
    })
    .filter(Boolean) as YoutubeVideo[];
}
