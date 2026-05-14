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

async function detectQuotaExceeded(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const data = await res.clone().json();
    const reason: string = data?.error?.errors?.[0]?.reason ?? "";
    return reason === "quotaExceeded" || reason === "dailyLimitExceeded";
  } catch {
    return false;
  }
}

export async function isYouTubeQuotaExceeded(): Promise<boolean> {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "id");
    url.searchParams.set("id", CHANNEL_ID ?? "");
    url.searchParams.set("key", API_KEY ?? "");
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    return detectQuotaExceeded(res);
  } catch {
    return false;
  }
}

export async function getLatestVideoFromRSS(): Promise<YTVideo | null> {
  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const res = await fetch(feedUrl, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const xml = await res.text();

    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;
    const entry = entryMatch[1];

    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    if (!id) return null;

    const title = entry.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? "";
    const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
    const description = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1]?.trim() ?? "";

    return {
      id,
      title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
      description,
      thumbnail: thumbUrl(id),
      publishedAt,
    };
  } catch {
    return null;
  }
}

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

type SearchItem = { id?: { videoId?: string } };
type DetailItem = { id: string; snippet?: { title?: string; description?: string; publishedAt?: string }; statistics?: { viewCount?: string }; contentDetails?: { duration?: string } };

async function fetchVideoDetails(ids: string[]): Promise<Map<string, DetailItem>> {
  const detailMap = new Map<string, DetailItem>();
  // YouTube videos.list accepts max 50 IDs per request
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

  await Promise.all(
    chunks.map(async (chunk) => {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "snippet,statistics,contentDetails");
      url.searchParams.set("id", chunk.join(","));
      url.searchParams.set("key", API_KEY ?? "");
      const res = await fetch(url.toString(), { next: { revalidate: 300 } });
      if (!res.ok) return;
      const data = await res.json();
      for (const v of (data.items ?? []) as DetailItem[]) detailMap.set(v.id, v);
    })
  );
  return detailMap;
}

export async function getAllVideos(maxResults = 200): Promise<YTVideo[]> {
  try {
    const allIds: string[] = [];
    let pageToken: string | undefined;
    const perPage = 50; // YouTube API maximum per search request

    // Paginate through search results until we have enough
    while (allIds.length < maxResults) {
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("channelId", CHANNEL_ID ?? "");
      searchUrl.searchParams.set("eventType", "completed");
      searchUrl.searchParams.set("order", "date");
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("maxResults", String(perPage));
      searchUrl.searchParams.set("key", API_KEY ?? "");
      if (pageToken) searchUrl.searchParams.set("pageToken", pageToken);

      const res = await fetch(searchUrl.toString(), { next: { revalidate: 300 } });
      if (!res.ok) break;
      const data = await res.json();
      const items: SearchItem[] = data.items ?? [];
      const ids = items.map((item) => item.id?.videoId ?? "").filter(Boolean);
      allIds.push(...ids);

      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }

    if (!allIds.length) return [];

    const limited = allIds.slice(0, maxResults);
    const detailMap = await fetchVideoDetails(limited);

    return limited
      .map((id) => {
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
      })
      .filter((v) => v.title); // drop any with no title
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
