import type { PodcastEpisode } from "@/lib/podcast";
import type { YTVideo } from "@/lib/youtube";

/**
 * Pairing the latest YouTube sermon with its podcast audio.
 *
 * Video and audio arrive from two feeds that know nothing about each other:
 * Buzzsprout RSS (`lib/podcast.ts`) and the YouTube Data API (`lib/youtube.ts`).
 * The featured card on /sermons needs both for the same message, so we match
 * them heuristically on publish date and title wording.
 *
 * Deliberately forgiving: the audio is usually uploaded a day or three after
 * the service, and the podcast title is often a tidied-up version of the
 * YouTube one ("Sunday Service | Walking In Faith" vs "Walking In Faith ||
 * Ps John"). When nothing matches confidently we still return the newest
 * episode so the "Listen" toggle is never a dead control — `confident` says
 * which of the two happened.
 */

export type SermonPair = {
  episode: PodcastEpisode | null;
  /** True when the episode was matched to the video rather than guessed. */
  confident: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Words that appear in almost every title and so carry no matching signal. */
const NOISE = new Set([
  "destiny",
  "church",
  "tees",
  "valley",
  "sunday",
  "service",
  "sermon",
  "message",
  "live",
  "stream",
  "morning",
  "evening",
  "with",
  "from",
  "that",
  "this",
  "your",
  "part",
  "week",
]);

/** Title → the set of meaningful words in it. */
function tokenise(raw: string): Set<string> {
  const words = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !NOISE.has(w));
  return new Set(words);
}

/** Jaccard similarity — shared words over total distinct words. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function daysApart(a: string, b: string): number {
  const t1 = new Date(a).getTime();
  const t2 = new Date(b).getTime();
  if (isNaN(t1) || isNaN(t2)) return Infinity;
  return Math.abs(t1 - t2) / DAY_MS;
}

/** Accept a candidate if it's near in time and either very near or similarly titled. */
const MAX_DAYS = 10;
const MIN_OVERLAP = 0.4;
const CLOSE_DAYS = 2;

export function pairAudioForVideo(
  video: YTVideo | null,
  episodes: PodcastEpisode[]
): SermonPair {
  if (episodes.length === 0) return { episode: null, confident: false };
  if (!video) return { episode: episodes[0], confident: false };

  const videoWords = tokenise(video.title);

  let best: PodcastEpisode | null = null;
  let bestScore = -1;

  for (const ep of episodes) {
    const gap = daysApart(video.publishedAt, ep.publishedAt);
    if (gap > MAX_DAYS) continue;

    const similarity = overlap(videoWords, tokenise(ep.title));
    if (similarity < MIN_OVERLAP && gap > CLOSE_DAYS) continue;

    // Prefer wording; break ties on recency to the video.
    const score = similarity * 2 + (MAX_DAYS - gap) / MAX_DAYS;
    if (score > bestScore) {
      bestScore = score;
      best = ep;
    }
  }

  return best
    ? { episode: best, confident: true }
    : { episode: episodes[0], confident: false };
}
