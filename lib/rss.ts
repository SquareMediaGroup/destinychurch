import { Sermon } from "./types";

export type PodcastEntry = {
  guid: string;
  title: string;
  pubDate: string;
  audioUrl: string;
  durationSeconds?: number;
};

export async function fetchPodcastEntries(feedUrl: string): Promise<PodcastEntry[]> {
  const res = await fetch(feedUrl);
  if (!res.ok) {
    throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  return parsePodcastFeed(xml);
}

export function mapPodcastToSermon(entry: PodcastEntry): Sermon {
  return {
    id: entry.guid,
    title: entry.title,
    date: entry.pubDate,
    speaker: "",
    podcastGuid: entry.guid,
    podcastPubDate: entry.pubDate,
    podcastAudioUrl: entry.audioUrl,
    durationSeconds: entry.durationSeconds,
    thumbnailUrl: "",
  };
}

const cleanText = (value?: string) =>
  value?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "";

const tagValue = (source: string, tag: string) => {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return cleanText(match?.[1]);
};

const enclosureUrl = (source: string) => {
  const match = source.match(/<enclosure[^>]*url="([^"]+)"/i);
  return match?.[1] ?? "";
};

const durationSeconds = (source: string) => {
  const raw = tagValue(source, "itunes:duration");
  if (!raw) return undefined;

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isFinite(seconds) ? seconds : undefined;
  }

  const parts = raw.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  let total = 0;
  if (parts.length === 3) {
    total = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    total = parts[0] * 60 + parts[1];
  } else {
    return undefined;
  }
  return Number.isFinite(total) ? total : undefined;
};

function parsePodcastFeed(xml: string): PodcastEntry[] {
  const segments = xml.split(/<item[\s>]/i).slice(1);

  return segments
    .map((segment) => segment.split(/<\/item>/i)[0])
    .map((chunk) => {
      const guid = tagValue(chunk, "guid");
      const title = tagValue(chunk, "title");
      const pubDate = tagValue(chunk, "pubDate");
      const audioUrl = enclosureUrl(chunk);
      const duration = durationSeconds(chunk);

      if (!guid || !title || !pubDate || !audioUrl) return null;

      return { guid, title, pubDate, audioUrl, durationSeconds: duration };
    })
    .filter(Boolean) as PodcastEntry[];
}
