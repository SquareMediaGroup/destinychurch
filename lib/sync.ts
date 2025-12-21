import { fetchPodcastEntries } from "./rss";
import { fetchCompletedYoutubeVideos } from "./youtube";
import { saveSermon } from "./db";
import { Sermon } from "./types";

export type SyncResult = {
  podcastCount: number;
  youtubeCount: number;
  saved: number;
  sermons: Sermon[];
  sample: Sermon[];
  note: string;
};

type SyncOptions = {
  limit?: number;
  sinceWeeks?: number;
  latestOnly?: boolean;
  dryRun?: boolean;
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const similarity = (a: string, b: string) => {
  const tokensA = new Set(normalize(a));
  const tokensB = new Set(normalize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t)) intersection += 1;
  });
  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
};

export async function syncSermons(options: SyncOptions = {}): Promise<SyncResult> {
  const rssUrl = process.env.PODCAST_RSS_URL;
  const youtubeChannelId = process.env.YOUTUBE_CHANNEL_ID;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;

  if (!rssUrl || !youtubeChannelId || !youtubeApiKey) {
    throw new Error(
      "Missing env config: PODCAST_RSS_URL, YOUTUBE_CHANNEL_ID, YOUTUBE_API_KEY are required.",
    );
  }

  const limit = Math.max(1, Math.min(Number(options.limit) || 25, 50));
  const sinceWeeks = options.sinceWeeks ?? 26;
  const sinceDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * sinceWeeks);
  const sinceIso = sinceDate.toISOString();

  const [podcast, youtube] = await Promise.all([
    fetchPodcastEntries(rssUrl),
    fetchCompletedYoutubeVideos(youtubeChannelId, youtubeApiKey, limit * 2, sinceIso),
  ]);

  const podcastFiltered = podcast.filter(
    (p) => new Date(p.pubDate).getTime() >= sinceDate.getTime(),
  );
  const podcastSorted = [...podcastFiltered].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );
  const podcastLimit = podcastSorted.slice(0, limit);

  const sermons: Sermon[] = [];
  const matchedYoutube = new Set<string>();

  const withinOneDay = (a: Date, b: Date) =>
    Math.abs(a.getTime() - b.getTime()) <= 1000 * 60 * 60 * 24;

  for (const p of podcastLimit) {
    const pDate = new Date(p.pubDate);
    const candidates = youtube.filter(
      (y) => !matchedYoutube.has(y.videoId) && withinOneDay(new Date(y.publishedAt), pDate),
    );
    let best = null as typeof youtube[number] | null;
    let bestScore = 0;
    for (const c of candidates) {
      const score = similarity(p.title, c.title);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }

    const match = bestScore >= 0.3 ? best : null;
    if (match) matchedYoutube.add(match.videoId);

    const id = match ? `sermon:${match.videoId}` : `podcast:${p.guid}`;
    sermons.push({
      id,
      title: match?.title ?? p.title,
      date: (match?.publishedAt ?? p.pubDate) || new Date().toISOString(),
      speaker: "Destiny Church",
      youtubeVideoId: match?.videoId,
      youtubePubDate: match?.publishedAt,
      podcastGuid: p.guid,
      podcastPubDate: p.pubDate,
      podcastAudioUrl: p.audioUrl,
      thumbnailUrl: match?.thumbnailUrl ?? "/destiny-logo.svg",
      summary: undefined,
      transcript: undefined,
    });
  }

  youtube
    .filter((y) => !matchedYoutube.has(y.videoId))
    .slice(0, limit)
    .forEach((y) => {
      sermons.push({
        id: `youtube:${y.videoId}`,
        title: y.title,
        date: y.publishedAt,
        speaker: "Destiny Church",
        youtubeVideoId: y.videoId,
        youtubePubDate: y.publishedAt,
        thumbnailUrl: y.thumbnailUrl,
        summary: undefined,
        transcript: undefined,
      });
    });

  if (options.latestOnly) {
    sermons.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    sermons.splice(1);
  }

  if (!options.dryRun) {
    await Promise.all(sermons.map((sermon) => saveSermon(sermon)));
  }

  return {
    podcastCount: podcastLimit.length,
    youtubeCount: youtube.length,
    saved: options.dryRun ? 0 : sermons.length,
    sermons,
    sample: sermons.slice(0, 3),
    note: `Matched by same-day date over the last ${sinceWeeks} weeks; fetched limit=${limit}.`,
  };
}
