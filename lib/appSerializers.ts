// Serialisers that turn internal shapes into the JSON the iOS app consumes.
//
// Everything messy about the upstream feeds is resolved here, once, so the
// Swift client is a pure renderer: no "1"/"0" string booleans, no empty-array
// image payloads, no relative URLs, no naive timestamps, no ISO-8601 durations
// to parse. If a client ever has to massage a value from these endpoints, the
// fix belongs in this file.

import {
  eventDescriptionText,
  eventImage,
  eventSignupUrl,
  feedDateToIso,
  isMultiday,
  sanitizeEventHtml,
  stripEmoji,
  type ChurchSuiteEvent,
  type EventSeries,
} from "@destiny/shared";
import { absolute } from "./appApi";
import type { PodcastEpisode, PodcastShow } from "./podcast";
import type { YTVideo } from "./youtube";

/** ChurchSuite is in Stockton; "11am" must mean 11am there, not on the phone. */
export const CHURCH_TIME_ZONE = "Europe/London";

export type AppEventOccurrence = {
  identifier: string | null;
  startsAt: string;
  endsAt: string;
  signupUrl: string | null;
};

export type AppEventSeries = {
  slug: string;
  seriesKey: string;
  name: string;
  sessionCount: number;
  /** Plain text, emoji-stripped, clamped — safe to render in a card. */
  summary: string;
  /** Sanitised HTML for the detail screen. Empty string when there is none. */
  descriptionHtml: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  location: {
    name: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  signupUrl: string | null;
  webUrl: string;
  icsUrl: string;
  timeZone: string;
  isMultiday: boolean;
  next: AppEventOccurrence;
  occurrences: AppEventOccurrence[];
};

function serializeOccurrence(event: ChurchSuiteEvent): AppEventOccurrence {
  return {
    identifier: event.identifier ?? null,
    startsAt: feedDateToIso(event.datetime_start),
    endsAt: feedDateToIso(event.datetime_end),
    signupUrl: eventSignupUrl(event),
  };
}

export function serializeEventSeries(series: EventSeries): AppEventSeries {
  const primary = series.primary;
  const location = primary.location;
  // The feed uses "" for an unknown address as often as it omits the field.
  const address = location?.address?.trim() || null;

  return {
    slug: series.slug,
    seriesKey: series.seriesKey,
    name: stripEmoji(series.name),
    sessionCount: series.sessionCount,
    summary: eventDescriptionText(primary, 300),
    descriptionHtml: sanitizeEventHtml(primary.description),
    imageUrl: absolute(eventImage(primary, "hero") ?? null),
    thumbnailUrl: absolute(eventImage(primary, "card") ?? null),
    categoryName: primary.category?.name ?? null,
    categoryColor: primary.category?.color ?? null,
    location: location
      ? {
          name: location.name?.trim() || null,
          address,
          latitude: location.latitude ?? null,
          longitude: location.longitude ?? null,
        }
      : null,
    signupUrl: eventSignupUrl(primary),
    webUrl: absolute(`/whats-on/${series.slug}`),
    icsUrl: absolute(`/api/events/${series.slug}/ics`),
    timeZone: CHURCH_TIME_ZONE,
    isMultiday: isMultiday(primary),
    next: serializeOccurrence(primary),
    occurrences: series.occurrences.map(serializeOccurrence),
  };
}

export type AppSermon = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  /** Parsed server-side — the app never sees an ISO-8601 duration. */
  durationSeconds: number | null;
  viewCount: number | null;
  youtubeUrl: string;
};

/**
 * ISO-8601 durations ("PT1H2M3S") → seconds. YouTube returns these on every
 * video; parsing them is not the client's job.
 */
export function iso8601DurationToSeconds(value?: string): number | null {
  if (!value) return null;
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!m) return null;
  const [, d, h, min, s] = m;
  return (
    Number(d ?? 0) * 86_400 +
    Number(h ?? 0) * 3_600 +
    Number(min ?? 0) * 60 +
    Number(s ?? 0)
  );
}

export function serializeSermon(video: YTVideo): AppSermon {
  const views = Number(video.viewCount);
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    // `thumbUrl()` returns a site-relative proxy path; the app gets no
    // URL-joining logic, so it is absolutised here.
    thumbnailUrl: absolute(video.thumbnail),
    publishedAt: video.publishedAt,
    durationSeconds: iso8601DurationToSeconds(video.duration),
    viewCount: Number.isFinite(views) ? views : null,
    youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
  };
}

export type AppPodcastEpisode = {
  id: string;
  title: string;
  speaker: string | null;
  summary: string;
  audioUrl: string;
  imageUrl: string;
  publishedAt: string;
  durationSeconds: number;
};

export type AppPodcastShow = {
  title: string;
  author: string;
  description: string;
  imageUrl: string;
  episodes: AppPodcastEpisode[];
};

export function serializePodcastEpisode(
  episode: PodcastEpisode,
): AppPodcastEpisode {
  return {
    id: episode.id,
    title: episode.title,
    speaker: episode.speaker,
    summary: episode.summary,
    audioUrl: episode.audioUrl,
    imageUrl: episode.image,
    publishedAt: episode.publishedAt,
    durationSeconds: episode.durationSeconds,
  };
}

export function serializePodcastShow(show: PodcastShow): AppPodcastShow {
  return {
    title: show.title,
    author: show.author,
    description: show.description,
    imageUrl: show.image,
    episodes: show.episodes.map(serializePodcastEpisode),
  };
}
