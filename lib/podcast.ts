// Buzzsprout podcast feed for Destiny Church Tees Valley (DCTV Podcast).
// We parse the RSS server-side (no XML dependency) and expose typed episodes.

import { splitOnDash } from "@/lib/sermonTitle";

// Same id the admin upload flow writes to (lib/buzzsprout.server.ts) — kept
// as one env var so the two never drift apart.
const PODCAST_ID = process.env.BUZZSPROUT_PODCAST_ID || "268765";
const FEED_URL = `https://feeds.buzzsprout.com/${PODCAST_ID}.rss`;

export type PodcastEpisode = {
  /** Stable id derived from the <guid> (e.g. "Buzzsprout-19296689"). */
  id: string;
  /** Cleaned episode title (speaker stripped off). */
  title: string;
  /** Speaker / preacher parsed from the title (after "||" or "|"), if present. */
  speaker: string | null;
  /** Plain-text summary, HTML stripped, trimmed. */
  summary: string;
  /** Direct MP3 enclosure URL. */
  audioUrl: string;
  /** Episode artwork (falls back to the show artwork). */
  image: string;
  /** ISO publish date. */
  publishedAt: string;
  /** Duration in whole seconds. */
  durationSeconds: number;
  /**
   * YouTube video id embedded by the admin upload flow (lib/buzzsprout.server.ts)
   * as an HTML comment in the description, e.g. `<!--yt:abc123DEF45-->`. Lets
   * lib/sermonPairing.ts match this episode to its video exactly instead of
   * guessing from title/date. Null for episodes published before that existed.
   */
  youtubeIdHint: string | null;
};

export type PodcastShow = {
  title: string;
  author: string;
  description: string;
  image: string;
  episodes: PodcastEpisode[];
};

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function unwrapCdata(input: string): string {
  const m = input.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : input;
}

function stripHtml(input: string): string {
  return decodeEntities(
    unwrapCdata(input)
      // The admin upload flow embeds a `<!--yt:VIDEO_ID-->` pairing hint in the
      // description (see extractYouTubeIdHint) — strip it before it's ever
      // shown as show notes.
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\s+/g, " ")
    .trim();
}

const YOUTUBE_HINT_RE = /<!--yt:([\w-]{11})-->/;

/** Pull the embedded YouTube video id hint out of a raw (pre-strip) description. */
function extractYouTubeIdHint(raw: string): string | null {
  return raw.match(YOUTUBE_HINT_RE)?.[1] ?? null;
}

function tag(block: string, name: string): string | null {
  const m = block.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i")
  );
  return m ? m[1] : null;
}

function attr(block: string, name: string, attribute: string): string | null {
  const m = block.match(
    new RegExp(`<${name}\\b[^>]*\\b${attribute}=["']([^"']+)["']`, "i")
  );
  return m ? m[1] : null;
}

const TITLE_RE = /\b(ps|pastor|rev|pr|bishop|dr|apostle|minister)\b/i;

/** Split a raw title into a clean title + speaker. */
function splitTitle(raw: string): { title: string; speaker: string | null } {
  const clean = decodeEntities(unwrapCdata(raw)).trim();

  // "||" is the feed's explicit speaker delimiter — always treat the tail as the speaker.
  if (clean.includes("||")) {
    const parts = clean.split("||");
    const speaker = parts[parts.length - 1].trim();
    const title = parts.slice(0, -1).join("||").trim();
    if (speaker) return { title, speaker };
  }

  // Single " | " — only treat the tail as a speaker if it looks like a name/title,
  // so we don't mangle things like "… - Q&A | Pastor Faith".
  const parts = clean.split(/\s+\|\s+/);
  if (parts.length >= 2 && TITLE_RE.test(parts[parts.length - 1])) {
    return {
      title: parts.slice(0, -1).join(" | ").trim(),
      speaker: parts[parts.length - 1].trim(),
    };
  }

  // No pipe at all — episode titles are often the same raw text as their
  // YouTube counterpart, which sometimes uses " - Speaker Name" instead of a
  // pipe. Shared with lib/sermonTitle.ts's YouTube-side parser.
  return splitOnDash(clean) ?? { title: clean, speaker: null };
}

let cache: { at: number; show: PodcastShow } | null = null;

export async function getPodcastShow(): Promise<PodcastShow> {
  // In-process memo to avoid re-parsing the ~1MB feed on every render in dev.
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.show;

  const res = await fetch(FEED_URL, {
    next: { revalidate: 1800 },
    headers: { "User-Agent": "DestinyChurchSite/1.0" },
  });
  if (!res.ok) throw new Error(`Buzzsprout feed ${res.status}`);
  const xml = await res.text();

  const channel = xml.split("<item>")[0];
  const showImage =
    attr(channel, "itunes:image", "href") ?? "";
  const show: PodcastShow = {
    title: stripHtml(tag(channel, "title") ?? "DCTV Podcast"),
    author: stripHtml(tag(channel, "itunes:author") ?? "Destiny Church"),
    description: stripHtml(tag(channel, "description") ?? ""),
    image: showImage,
    episodes: [],
  };

  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const item of items) {
    const guid = stripHtml(tag(item, "guid") ?? "");
    const audioUrl = attr(item, "enclosure", "url");
    if (!guid || !audioUrl) continue;

    const { title, speaker } = splitTitle(tag(item, "title") ?? "");
    const durationRaw = stripHtml(tag(item, "itunes:duration") ?? "0");
    const durationSeconds = parseDuration(durationRaw);
    const rawDescription = tag(item, "description") ?? "";
    const youtubeIdHint = extractYouTubeIdHint(rawDescription);

    show.episodes.push({
      id: guid.replace(/[^a-zA-Z0-9-]/g, ""),
      title,
      speaker,
      summary: truncate(
        stripHtml(tag(item, "itunes:summary") ?? rawDescription),
        400
      ),
      audioUrl,
      image: attr(item, "itunes:image", "href") ?? showImage,
      publishedAt: toIso(stripHtml(tag(item, "pubDate") ?? "")),
      youtubeIdHint,
      durationSeconds,
    });
  }

  cache = { at: Date.now(), show };
  return show;
}

/**
 * Cut to a whole word and mark the cut.
 *
 * Show notes run long; a hard slice leaves the card ending mid-word, which is
 * visible whenever the copy is short enough to escape the CSS line clamp.
 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Buzzsprout uses raw seconds, but handle HH:MM:SS just in case. */
function parseDuration(raw: string): number {
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const parts = raw.split(":").map((n) => parseInt(n, 10) || 0);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function toIso(rfc822: string): string {
  const d = new Date(rfc822);
  return isNaN(d.getTime()) ? rfc822 : d.toISOString();
}

export function formatEpisodeDuration(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function formatClock(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatEpisodeDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
