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

/**
 * The church's YouTube channel, in one place.
 *
 * Two different strings for the same channel, and they are not interchangeable:
 * the `@` handle is `DestinyOnlineChurch`, the custom URL is
 * `/destinychurchteesvalley`. `@DestinyChurchTeesValley` is neither and resolves
 * to nothing — which is what the org schema and `/help` were both pointing at.
 *
 * Plain constants, not env reads: this module is reachable from client
 * components, and a non-`NEXT_PUBLIC_` variable is `undefined` in the browser
 * bundle, which would hydrate a different href than the server rendered.
 */
export const CHANNEL_HANDLE = "DestinyOnlineChurch";
export const CHANNEL_VANITY = "destinychurchteesvalley";
/** Canonical public link — the custom URL. */
export const CHANNEL_URL = `https://www.youtube.com/${CHANNEL_VANITY}`;

export function decodeEntities(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

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
      title: decodeEntities(title),
      description,
      thumbnail: thumbUrl(id),
      publishedAt,
    };
  } catch {
    return null;
  }
}

/**
 * The channel's most recent uploads, newest first, straight from the public RSS
 * feed. Costs no API quota, which is why live detection leans on it as a source
 * of candidate video ids when scraping the /live page comes back empty.
 */
export async function getRecentVideoIdsFromRSS(channelId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    return Array.from(xml.matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>/g)).map((m) => m[1]);
  } catch {
    return [];
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

/* ── Livestream detection ─────────────────────────────────────────────────────
   Answers one question — "are we streaming right now, and on which video?" —
   for both the /live page and the site-wide "WE ARE LIVE" banner.

   Zero-quota in the common case: it reads YouTube's own /live URL, which
   resolves to the current broadcast when there is one and to the channel home
   when there isn't. The Data API is only touched when that read is
   *inconclusive* (consent wall, bot check, or a page shape we don't recognise),
   and then only through videos.list at 1 unit — never search?eventType=live,
   which costs 100 units a call and would burn the whole daily quota inside an
   hour of 60-second polling.

   Fails closed: anything unexpected returns { live: false }, so a YouTube
   outage shows the offline page rather than an empty player.
   ────────────────────────────────────────────────────────────────────────── */

export type LiveStatus = {
  live: boolean;
  videoId: string | null;
  title?: string;
  /**
   * When the broadcast started. For a real stream, what YouTube reports; for a
   * simulated one, the instant the "broadcast" began — which is also the
   * origin every viewer's playhead is measured from.
   */
  startedAt?: string;
  /** Start time of a scheduled-but-not-yet-started broadcast. */
  scheduledFor?: string;
  /**
   * True when this is a pre-uploaded video being played as a broadcast rather
   * than an actual stream. The player uses it to sync the playhead to
   * `startedAt`; /live uses it to drop the "open on YouTube" links, which
   * would hand the viewer a scrubbable video and break the illusion.
   */
  simulated?: boolean;
  /** Simulated only: when it goes off air (`startedAt` + the video's runtime). */
  endsAt?: string;
  /** Simulated only: optional line under the player. */
  notice?: string;
  /**
   * Server clock at the moment this was produced. The browser subtracts its
   * own clock to get a skew correction, so a viewer whose device is two
   * minutes out still watches at the same point as everyone else.
   */
  serverTime?: string;
  /** Which detection layer produced this answer. Surfaced by ?debug=1. */
  source?: string;
  checkedAt: string;
};

const YT_PAGE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  // Without these YouTube serves EU/datacentre traffic the "Before you continue"
  // consent wall instead of the page, and every marker we look for disappears.
  Cookie: "CONSENT=YES+cb; SOCS=CAI",
};

/**
 * Pull a top-level JSON object out of a YouTube page by brace-matching from the
 * first `{` after `marker`.
 *
 * A regex can't do this job. The blobs are ~1MB of nested JSON whose strings
 * contain braces and escaped quotes, so a non-greedy match truncates and a
 * greedy one swallows the rest of the document. Worse, the old code matched
 * `"isLiveNow":…` *anywhere* in the HTML — including the recommendation shelves
 * that YouTube renders above the player response — so a page for a stream that
 * really was live could be decided by some unrelated video's flag. That is the
 * bug that made the page miss live services.
 */
function extractJsonAfter(html: string, marker: string): unknown | null {
  const markerAt = html.indexOf(marker);
  if (markerAt === -1) return null;
  const start = html.indexOf("{", markerAt);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

type PlayerResponse = {
  videoDetails?: {
    videoId?: string;
    title?: string;
    /** Streaming right now. */
    isLive?: boolean;
    /** Was *ever* a broadcast — true of every past Sunday, so never trust it alone. */
    isLiveContent?: boolean;
    isUpcoming?: boolean;
  };
  microformat?: {
    playerMicroformatRenderer?: {
      title?: { simpleText?: string };
      liveBroadcastDetails?: {
        isLiveNow?: boolean;
        startTimestamp?: string;
        endTimestamp?: string;
      };
    };
  };
  playabilityStatus?: {
    liveStreamability?: {
      liveStreamabilityRenderer?: {
        offlineSlate?: {
          liveStreamOfflineSlateRenderer?: { scheduledStartTime?: string };
        };
      };
    };
  };
};

export type PageVerdict =
  | { kind: "live"; videoId: string; title?: string; startedAt?: string }
  | { kind: "upcoming"; videoId: string; title?: string; scheduledFor?: string }
  /** Page read cleanly and there is definitively no broadcast on air. */
  | { kind: "offline" }
  /** Saw a video id but couldn't tell — worth a 1-unit API confirm. */
  | { kind: "candidate"; videoId: string }
  /** Consent wall, bot check, or an unrecognised shell. Escalate. */
  | { kind: "unknown" };

/** Exported for tests/unit/live-detection.spec.ts — the parsing is the bit that broke. */
export function parseLivePage(html: string): PageVerdict {
  const player = extractJsonAfter(html, "ytInitialPlayerResponse") as PlayerResponse | null;
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
  const canonicalVideoId =
    canonical.match(/youtube\.com\/watch\?v=([\w-]{11})/)?.[1] ?? null;

  const details = player?.videoDetails;
  const micro = player?.microformat?.playerMicroformatRenderer;
  const broadcast = micro?.liveBroadcastDetails;
  const videoId = details?.videoId ?? canonicalVideoId;

  if (videoId && (details || broadcast)) {
    const title =
      decodeEntities(details?.title ?? micro?.title?.simpleText) ||
      decodeEntities(html.match(/<meta name="title" content="([^"]*)"/)?.[1]) ||
      undefined;

    if (details?.isLive === true || broadcast?.isLiveNow === true) {
      return { kind: "live", videoId, title, startedAt: broadcast?.startTimestamp };
    }

    const scheduledSeconds =
      player?.playabilityStatus?.liveStreamability?.liveStreamabilityRenderer
        ?.offlineSlate?.liveStreamOfflineSlateRenderer?.scheduledStartTime;
    if (details?.isUpcoming === true || scheduledSeconds) {
      const scheduledFor = scheduledSeconds
        ? new Date(Number(scheduledSeconds) * 1000).toISOString()
        : broadcast?.startTimestamp;
      return { kind: "upcoming", videoId, title, scheduledFor };
    }

    // A finished broadcast (isLiveContent with an end timestamp) is a clean
    // "no" — /live only lands here once the stream is over.
    if (broadcast?.endTimestamp || details?.isLiveContent === false) {
      return { kind: "offline" };
    }
    return { kind: "candidate", videoId };
  }

  // No broadcast on air: /live redirects to the channel home, whose canonical is
  // the channel URL. That is a definitive answer, not a failure. All four forms
  // are accepted — YouTube normally canonicalises to the @handle, but the same
  // channel is also reachable as /channel/UC…, /c/name and a bare custom URL,
  // and treating one of those as "unreadable" would escalate to a quota-costing
  // API call every minute we aren't streaming.
  if (
    /youtube\.com\/(?:channel\/UC[\w-]+|@[\w.-]+|(?:c|user)\/[\w.-]+|[\w.-]+)\/?$/.test(
      canonical
    )
  ) {
    return { kind: "offline" };
  }

  if (videoId) return { kind: "candidate", videoId };
  return { kind: "unknown" };
}

async function scrapeLivePage(url: string): Promise<PageVerdict> {
  try {
    // `cache: "no-store"` on purpose. A watch page is several MB, well past the
    // 2MB ceiling on Next's fetch data cache, so `next: { revalidate }` was
    // silently caching nothing and re-scraping YouTube on every single render —
    // slow, and enough traffic to earn a bot check. Caching is handled by the
    // in-process memo on getLiveStatus() instead.
    const res = await fetch(url, { headers: YT_PAGE_HEADERS, cache: "no-store" });
    if (!res.ok) return { kind: "unknown" };
    // A bounce to consent.youtube.com means we never saw the real page.
    if (/consent\.(youtube|google)\./.test(res.url)) return { kind: "unknown" };
    return parseLivePage(await res.text());
  } catch {
    return { kind: "unknown" };
  }
}

/**
 * The endpoint YouTube's own "latest live" embed uses. It is a few KB rather
 * than a few MB and isn't consent-gated, so it still answers in places the full
 * channel page doesn't.
 */
async function scrapeLiveEmbed(channelId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/embed/live_stream?channel=${channelId}`,
      { headers: YT_PAGE_HEADERS, cache: "no-store" }
    );
    if (!res.ok) return null;
    const html = await res.text();
    return (
      html.match(/["']video_id["']\s*:\s*["']([\w-]{11})["']/)?.[1] ??
      html.match(/["']videoId["']\s*:\s*["']([\w-]{11})["']/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}

type ApiLiveHit = { videoId: string; title?: string; startedAt?: string };

/**
 * Authoritative check on up to 50 candidate ids for one quota unit.
 * `liveBroadcastContent === "live"` is YouTube's own answer to the question —
 * no scraping heuristics involved.
 */
async function confirmLiveViaApi(videoIds: string[]): Promise<ApiLiveHit | null> {
  if (!API_KEY || videoIds.length === 0) return null;
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,liveStreamingDetails");
    url.searchParams.set("id", videoIds.slice(0, 50).join(","));
    url.searchParams.set("key", API_KEY);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    type Item = {
      id?: string;
      snippet?: { title?: string; liveBroadcastContent?: string };
      liveStreamingDetails?: { actualStartTime?: string; actualEndTime?: string };
    };
    for (const item of (data.items ?? []) as Item[]) {
      if (!item.id) continue;
      if (item.snippet?.liveBroadcastContent !== "live") continue;
      // A stream with an end time has finished, whatever the snippet says.
      if (item.liveStreamingDetails?.actualEndTime) continue;
      return {
        videoId: item.id,
        title: item.snippet?.title,
        startedAt: item.liveStreamingDetails?.actualStartTime,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function detectLiveStatus(): Promise<LiveStatus> {
  const checkedAt = new Date().toISOString();
  const offline = (source: string, extra?: Partial<LiveStatus>): LiveStatus => ({
    live: false,
    videoId: null,
    checkedAt,
    source,
    ...extra,
  });

  if (process.env.LIVE_DISABLED === "1") return offline("disabled");

  // Three URL forms for the same channel, tried in order. The handle and custom
  // URL are the way back in when YOUTUBE_CHANNEL_ID is unset or stale, which
  // used to make detection fail silently and permanently. Overridable for a
  // rename without a deploy; server-side only, so no client bundle reads this.
  const handle = (process.env.YOUTUBE_CHANNEL_HANDLE ?? CHANNEL_HANDLE).replace(/^@/, "");
  const vanity = (process.env.YOUTUBE_CHANNEL_VANITY ?? CHANNEL_VANITY).replace(/^\//, "");
  if (!CHANNEL_ID && !handle && !vanity) return offline("no-channel");

  const pages = [
    CHANNEL_ID ? `https://www.youtube.com/channel/${CHANNEL_ID}/live` : null,
    handle ? `https://www.youtube.com/@${handle}/live` : null,
    vanity ? `https://www.youtube.com/${vanity}/live` : null,
  ].filter((u): u is string => Boolean(u));

  const candidates: string[] = [];
  let sawDefiniteOffline = false;
  let upcoming: LiveStatus | null = null;

  for (const url of pages) {
    const verdict = await scrapeLivePage(url);

    if (verdict.kind === "live") {
      return {
        live: true,
        videoId: verdict.videoId,
        title: verdict.title,
        startedAt: verdict.startedAt,
        checkedAt,
        source: "channel-page",
      };
    }
    // A definitive answer from any one URL form settles it — they are the same
    // channel, so the remaining forms only get tried when this one was blocked
    // or unreadable. The offline path stays at exactly one fetch.
    if (verdict.kind === "upcoming") {
      upcoming = offline("channel-page", {
        scheduledFor: verdict.scheduledFor,
        title: verdict.title,
      });
      sawDefiniteOffline = true;
      break;
    }
    if (verdict.kind === "offline") {
      sawDefiniteOffline = true;
      break;
    }
    if (verdict.kind === "candidate" && !candidates.includes(verdict.videoId)) {
      candidates.push(verdict.videoId);
    }
  }

  // A clean read said no. Trust it and spend nothing — this is the path taken
  // every minute of every day the church isn't streaming.
  if (sawDefiniteOffline && candidates.length === 0) {
    return upcoming ?? offline("channel-page");
  }

  // Otherwise the scrape was inconclusive. Try the cheap second opinion first…
  if (CHANNEL_ID) {
    const embedId = await scrapeLiveEmbed(CHANNEL_ID);
    if (embedId && !candidates.includes(embedId)) candidates.push(embedId);

    // …then the last few uploads, where a stream we were redirected away from
    // still shows up. Both are free; only the confirm below costs quota.
    if (candidates.length === 0) {
      const recent = await getRecentVideoIdsFromRSS(CHANNEL_ID);
      candidates.push(...recent.slice(0, 5));
    }
  }

  const hit = await confirmLiveViaApi(candidates);
  if (hit) {
    return {
      live: true,
      videoId: hit.videoId,
      title: hit.title,
      startedAt: hit.startedAt,
      checkedAt,
      source: "videos.list",
    };
  }

  return upcoming ?? offline(candidates.length ? "confirmed-offline" : "no-signal");
}

/* Cached in-process rather than through Next's fetch cache: the underlying
   pages are too big for it, and one memo covers the root layout's banner check
   and the /live page render in the same request. Kept short so the banner and
   the player flip over within a minute of the stream starting or ending. */
const LIVE_TTL_MS = 30_000;
const OFFLINE_TTL_MS = 60_000;

let liveCache: { value: LiveStatus; expiresAt: number } | null = null;
let liveInFlight: Promise<LiveStatus> | null = null;

/**
 * Is the YouTube channel actually streaming right now?
 *
 * This is the real-broadcast half only. Callers want `getLiveStatus()` from
 * lib/liveStatus.server.ts, which layers simulated live underneath it — a real
 * stream always wins, so a simulated service left switched on can never hide
 * an actual one.
 */
export async function getYouTubeLiveStatus(): Promise<LiveStatus> {
  if (liveCache && liveCache.expiresAt > Date.now()) return liveCache.value;
  // Concurrent callers (layout + page) share one detection pass.
  if (liveInFlight) return liveInFlight;

  liveInFlight = detectLiveStatus()
    .then((value) => {
      liveCache = {
        value,
        expiresAt: Date.now() + (value.live ? LIVE_TTL_MS : OFFLINE_TTL_MS),
      };
      return value;
    })
    .catch(
      (): LiveStatus =>
        // Keep the last known answer over a transient failure rather than
        // yanking a running stream off the page.
        liveCache?.value ?? {
          live: false,
          videoId: null,
          checkedAt: new Date().toISOString(),
          source: "error",
        }
    )
    .finally(() => {
      liveInFlight = null;
    });

  return liveInFlight;
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
