export type YTVideo = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  viewCount?: string;
  duration?: string;
};

export function thumbUrl(id: string): string {
  return `/api/youtube/thumbnail/${id}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function formatViews(n: string | undefined): string {
  if (!n) return "";
  const num = parseInt(n, 10);
  if (isNaN(num)) return "";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K views`;
  return `${num} views`;
}

export function formatDuration(iso8601: string | undefined): string {
  if (!iso8601) return "";
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const h = parseInt(match[1] ?? "0", 10);
  const m = parseInt(match[2] ?? "0", 10);
  const s = parseInt(match[3] ?? "0", 10);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

export async function getLatestVideo(): Promise<YTVideo | null> {
  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("channelId", CHANNEL_ID ?? "");
    searchUrl.searchParams.set("eventType", "completed");
    searchUrl.searchParams.set("order", "date");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "1");
    searchUrl.searchParams.set("key", API_KEY ?? "");

    const res = await fetch(searchUrl.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.items ?? [];
    if (!items.length) return null;

    const item = items[0];
    const id: string = item.id?.videoId ?? "";
    if (!id) return null;

    // Fetch extra details (statistics + contentDetails) for this video
    return await getVideo(id);
  } catch {
    return null;
  }
}

export async function getAllVideos(maxResults = 50): Promise<YTVideo[]> {
  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("channelId", CHANNEL_ID ?? "");
    searchUrl.searchParams.set("eventType", "completed");
    searchUrl.searchParams.set("order", "date");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", String(maxResults));
    searchUrl.searchParams.set("key", API_KEY ?? "");

    const res = await fetch(searchUrl.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { maxres?: { url?: string }; high?: { url?: string } } } }> = data.items ?? [];
    if (!items.length) return [];

    // Fetch details for all videos in one batch
    const ids = items.map((item) => item.id?.videoId ?? "").filter(Boolean);
    const detailUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailUrl.searchParams.set("part", "snippet,statistics,contentDetails");
    detailUrl.searchParams.set("id", ids.join(","));
    detailUrl.searchParams.set("key", API_KEY ?? "");

    const detailRes = await fetch(detailUrl.toString(), { next: { revalidate: 300 } });
    if (!detailRes.ok) {
      // Fall back to snippet-only data
      return items.map((item) => {
        const id = item.id?.videoId ?? "";
        const snippet = item.snippet ?? {};
        return {
          id,
          title: snippet.title ?? "",
          description: snippet.description ?? "",
          thumbnail: thumbUrl(id),
          publishedAt: snippet.publishedAt ?? "",
        };
      });
    }

    const detailData = await detailRes.json();
    const detailMap = new Map<string, { snippet?: { title?: string; description?: string; publishedAt?: string }; statistics?: { viewCount?: string }; contentDetails?: { duration?: string } }>();
    for (const v of (detailData.items ?? [])) {
      detailMap.set(v.id, v);
    }

    return ids.map((id) => {
      const v = detailMap.get(id);
      const snippet = v?.snippet ?? {};
      return {
        id,
        title: snippet.title ?? "",
        description: snippet.description ?? "",
        thumbnail: thumbUrl(id),
        publishedAt: snippet.publishedAt ?? "",
        viewCount: v?.statistics?.viewCount,
        duration: v?.contentDetails?.duration,
      };
    });
  } catch {
    return [];
  }
}

export async function getPlaylistVideos(playlistId: string, maxResults = 20): Promise<YTVideo[]> {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("key", API_KEY ?? "");

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items: Array<{ snippet?: { resourceId?: { videoId?: string }; title?: string; description?: string; publishedAt?: string } }> = data.items ?? [];

    return items
      .filter((item) => item.snippet?.resourceId?.videoId)
      .map((item) => {
        const s = item.snippet!;
        const id = s.resourceId!.videoId!;
        return {
          id,
          title: s.title ?? "",
          description: s.description ?? "",
          thumbnail: thumbUrl(id),
          publishedAt: s.publishedAt ?? "",
        };
      });
  } catch {
    return [];
  }
}

export async function getVideo(id: string): Promise<YTVideo | null> {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", id);
    url.searchParams.set("key", API_KEY ?? "");

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.items ?? [];
    if (!items.length) return null;

    const v = items[0];
    const snippet = v.snippet ?? {};

    return {
      id,
      title: snippet.title ?? "",
      description: snippet.description ?? "",
      thumbnail: thumbUrl(id),
      publishedAt: snippet.publishedAt ?? "",
      viewCount: v.statistics?.viewCount,
      duration: v.contentDetails?.duration,
    };
  } catch {
    return null;
  }
}
