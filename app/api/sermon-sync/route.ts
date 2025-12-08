import { NextResponse } from "next/server";
import { fetchPodcastEntries } from "@/lib/rss";
import { fetchCompletedYoutubeVideos } from "@/lib/youtube";
import { saveSermon } from "@/lib/db";
import { Sermon } from "@/lib/types";

export const runtime = "nodejs";

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

export async function GET(request: Request) {
  const rssUrl = process.env.PODCAST_RSS_URL;
  const youtubeChannelId = process.env.YOUTUBE_CHANNEL_ID;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const sinceDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 26); // last 26 weeks
  const sinceIso = sinceDate.toISOString();
  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Math.max(1, Math.min(Number(limitParam) || 25, 50));

  if (!rssUrl || !youtubeChannelId || !youtubeApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing env config: PODCAST_RSS_URL, YOUTUBE_CHANNEL_ID, YOUTUBE_API_KEY are required.",
      },
      { status: 500 },
    );
  }

  try {
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
    const podcast25 = podcastSorted.slice(0, limit);

    const sermons: Sermon[] = [];
    const matchedYoutube = new Set<string>();

    const withinOneDay = (a: Date, b: Date) =>
      Math.abs(a.getTime() - b.getTime()) <= 1000 * 60 * 60 * 24;

    for (const p of podcast25) {
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

    await Promise.all(sermons.map((sermon) => saveSermon(sermon)));

    return NextResponse.json({
      status: "ok",
      podcastCount: podcast25.length,
      youtubeCount: youtube.length,
      saved: sermons.length,
      sample: sermons.slice(0, 3),
      note: `Matched by same-day date over the last 26 weeks; fetched limit=${limit}.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
