// Turning the flat ChurchSuite feed into the site's event model.
//
// The feed is a list of *occurrences*: the seven "Destiny 12:2" rows are seven
// separate entries that all carry `sequence: 2197`. The site wants one page and
// one card per *series*, listing its sessions — so this module groups by
// `sequence ?? id` and mints one slug per group.
//
// `buildEventIndex` is the single source of truth for slugs. The grid, the
// cards, the detail page, generateStaticParams, the sitemap and the admin
// picker all read from it, so a slug can never disagree between two surfaces.

import { byStart, isUpcoming, parseFeedDate } from "./dates";
import { stripEmoji, type ChurchSuiteEvent } from "./events";

/** A group of occurrences that share a `sequence` (or a lone one-off). */
export type EventSeries = {
  /** URL slug — unique across the index. */
  slug: string;
  /** `String(sequence ?? id)`. Stable while ChurchSuite keeps the series. */
  seriesKey: string;
  name: string;
  /** The next upcoming occurrence — what cards and metadata describe. */
  primary: ChurchSuiteEvent;
  /** Every upcoming occurrence, earliest first. Length === sessionCount. */
  occurrences: ChurchSuiteEvent[];
  sessionCount: number;
};

export type EventIndex = {
  /** Every series with at least one upcoming occurrence, earliest first. */
  series: EventSeries[];
  bySlug: Map<string, EventSeries>;
  /** Every occurrence identifier → its series, for stable-link redirects. */
  byIdentifier: Map<string, EventSeries>;
};

export type BuildEventIndexOptions = {
  /**
   * Override the slugifier. The web app's `lib/jobs.ts` has an identical one,
   * but importing it here would point this package at the app's `@/` alias,
   * which does not resolve under Metro for the mobile app.
   */
  slugify?: (input: string) => string;
  /**
   * Slugs a real event may not take, because a static route already owns them
   * (e.g. `/whats-on/new` while the variant preview route exists). A collision
   * here forces the identifier suffix instead of silently shadowing the event.
   */
  reservedSlugs?: ReadonlySet<string>;
  now?: number;
};

/** Mirrors `slugify` in lib/jobs.ts — kept local so shared has no app imports. */
export function slugifyEventName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Group the feed into series and mint a stable slug for each.
 *
 * Past occurrences are dropped. Slugs are assigned in date order, so the
 * soonest event wins a contested name and later claimants take an
 * identifier-suffixed slug — deterministic, and independent of the order
 * ChurchSuite happens to return rows in.
 */
export function buildEventIndex(
  events: ChurchSuiteEvent[],
  options: BuildEventIndexOptions = {},
): EventIndex {
  const {
    slugify = slugifyEventName,
    reservedSlugs,
    now = Date.now(),
  } = options;

  const groups = new Map<string, ChurchSuiteEvent[]>();
  for (const event of events) {
    if (!isUpcoming(event, now)) continue;
    const key = String(event.sequence ?? event.id);
    const existing = groups.get(key);
    if (existing) existing.push(event);
    else groups.set(key, [event]);
  }

  // Sort by first occurrence, then by key, so slug assignment is deterministic
  // regardless of feed ordering.
  const ordered = Array.from(groups.entries())
    .map(([seriesKey, occurrences]) => ({
      seriesKey,
      occurrences: [...occurrences].sort(byStart),
    }))
    .sort((a, b) => {
      const diff = byStart(a.occurrences[0], b.occurrences[0]);
      return diff !== 0 ? diff : a.seriesKey.localeCompare(b.seriesKey);
    });

  const taken = new Set<string>();
  const series: EventSeries[] = ordered.map(({ seriesKey, occurrences }) => {
    const primary = occurrences[0];
    const base = slugify(stripEmoji(primary.name)) || `event-${primary.identifier ?? primary.id}`;

    // First claimant keeps the clean slug; anything contested or reserved falls
    // back to the occurrence identifier, which is unique by construction.
    const slug =
      taken.has(base) || reservedSlugs?.has(base)
        ? `${base}-${primary.identifier ?? primary.id}`
        : base;
    taken.add(slug);

    return {
      slug,
      seriesKey,
      name: stripEmoji(primary.name),
      primary,
      occurrences,
      sessionCount: occurrences.length,
    };
  });

  const bySlug = new Map(series.map((s) => [s.slug, s]));
  const byIdentifier = new Map<string, EventSeries>();
  for (const s of series) {
    for (const occurrence of s.occurrences) {
      if (occurrence.identifier) byIdentifier.set(occurrence.identifier, s);
    }
  }

  return { series, bySlug, byIdentifier };
}

/** Group a series list by calendar month, preserving date order. */
export function groupSeriesByMonth(
  series: EventSeries[],
): { key: string; label: string; events: EventSeries[] }[] {
  const groups: { key: string; label: string; events: EventSeries[] }[] = [];
  for (const item of series) {
    const start = parseFeedDate(item.primary.datetime_start);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.events.push(item);
    } else {
      groups.push({
        key,
        label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        events: [item],
      });
    }
  }
  return groups;
}

/** When the whole series is over — used for auto-expiring a featured event. */
export function lastOccurrenceEnd(series: EventSeries): number {
  return series.occurrences.reduce(
    (max, e) => Math.max(max, parseFeedDate(e.datetime_end).getTime()),
    0,
  );
}
