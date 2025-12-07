import { Sermon } from "./types";

export type PodcastEntry = {
  guid: string;
  title: string;
  pubDate: string;
  audioUrl: string;
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

function parsePodcastFeed(xml: string): PodcastEntry[] {
  const segments = xml.split(/<item[\s>]/i).slice(1);

  return segments
    .map((segment) => segment.split(/<\/item>/i)[0])
    .map((chunk) => {
      const guid = tagValue(chunk, "guid");
      const title = tagValue(chunk, "title");
      const pubDate = tagValue(chunk, "pubDate");
      const audioUrl = enclosureUrl(chunk);

      if (!guid || !title || !pubDate || !audioUrl) return null;

      return { guid, title, pubDate, audioUrl };
    })
    .filter(Boolean) as PodcastEntry[];
}
