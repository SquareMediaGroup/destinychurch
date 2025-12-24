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
  const podcastLimit = podcastSorted.slice(0, 1);

  const sermons: Sermon[] = [];
  for (const p of podcastLimit) {
    sermons.push({
      id: `podcast:${p.guid}`,
      title: p.title,
      date: p.pubDate || new Date().toISOString(),
      speaker: "Destiny Church",
      podcastGuid: p.guid,
      podcastPubDate: p.pubDate,
      podcastAudioUrl: p.audioUrl,
      thumbnailUrl: "/destiny-logo.svg",
      summary: undefined,
      transcript: undefined,
    });
  }

  youtube
    .slice(0, 1)
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
    note: "Saved latest podcast and latest YouTube upload only (no matching).",
  };
}
