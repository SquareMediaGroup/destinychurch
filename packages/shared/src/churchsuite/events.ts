// ChurchSuite public calendar feed — shared types + logic.
//
// Destiny exposes its calendar as an unauthenticated JSON embed (no API key),
// already used across the web app and reused by the app BFF. The web pages add
// their own Next.js `{ next: { revalidate } }` caching when calling
// `fetchChurchSuiteEvents`; the BFF applies its own short-TTL cache. This module
// stays framework-agnostic.

/** A single event as returned by the ChurchSuite calendar JSON embed. */
export type ChurchSuiteEvent = {
  id: number;
  name: string;
  datetime_start: string;
  datetime_end: string;
  /** HTML, not plain text. Blank on most recurring services. */
  description?: string | null;
  location?: { name?: string } | null;
  images?: { original_500?: string; original_1000?: string; md?: string } | null;
  identifier?: string;
  /**
   * ChurchSuite sends "1" / "0" *strings* here, not booleans — use
   * `eventSignupUrl` rather than testing these fields directly.
   */
  signup_options?: {
    signup_enabled?: string | boolean;
    tickets?: { enabled?: string | boolean; url?: string } | null;
  } | null;
};

/**
 * An event collapsed with the other sessions that share its name.
 * `sessionCount > 1` means it is a recurring course/series rather than a one-off.
 */
export type DeduplicatedEvent = ChurchSuiteEvent & { sessionCount: number };

/** The public, unauthenticated calendar JSON endpoint for Destiny's ChurchSuite. */
export const CHURCHSUITE_CALENDAR_JSON_URL =
  "https://destinytees.churchsuite.com/embed/calendar/json";

/** Base URL for the public ChurchSuite events pages. */
export const CHURCHSUITE_EVENTS_URL = "https://destinytees.churchsuite.com/events";

/**
 * Collapse events by (case-insensitive, trimmed) name, keeping the first
 * occurrence and counting how many sessions share that name.
 */
export function deduplicateEvents(events: ChurchSuiteEvent[]): DeduplicatedEvent[] {
  const map = new Map<string, { event: ChurchSuiteEvent; count: number }>();
  for (const event of events) {
    const key = event.name.toLowerCase().trim();
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { event, count: 1 });
    }
  }
  return Array.from(map.values()).map(({ event, count }) => ({
    ...event,
    sessionCount: count,
  }));
}

/** Public ChurchSuite page for an event (falls back to the events index). */
export function churchSuiteEventUrl(identifier?: string): string {
  return identifier
    ? `${CHURCHSUITE_EVENTS_URL}/${identifier}`
    : CHURCHSUITE_EVENTS_URL;
}

/** ChurchSuite encodes booleans as the strings "1" and "0". */
function isEnabled(value?: string | boolean): boolean {
  return value === true || value === "1";
}

/**
 * Whether an event takes signups, and where. Returns null when signups are off,
 * so callers can fall back to a plain "find out more" link.
 */
export function eventSignupUrl(event: ChurchSuiteEvent): string | null {
  const options = event.signup_options;
  if (!options || !isEnabled(options.signup_enabled)) return null;
  return options.tickets?.url ?? churchSuiteEventUrl(event.identifier);
}

/**
 * The event description as plain text. The feed returns HTML with links; promo
 * surfaces want a clean single paragraph, optionally clamped to `maxLength`.
 */
export function eventDescriptionText(
  event: ChurchSuiteEvent,
  maxLength?: number,
): string {
  const text = (event.description ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (!maxLength || text.length <= maxLength) return text;
  // Trim back to a word boundary so the ellipsis doesn't land mid-word.
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:]$/, "")}…`;
}

/**
 * Fetch and parse the ChurchSuite calendar feed. Returns `[]` on any error or
 * non-OK response so callers can render a graceful empty/degraded state.
 *
 * `init` is passed straight to `fetch`, so a Next.js caller can supply
 * `{ next: { revalidate: 300 } }` and the BFF can supply its own cache options.
 */
export async function fetchChurchSuiteEvents(
  init?: RequestInit,
): Promise<ChurchSuiteEvent[]> {
  try {
    const res = await fetch(CHURCHSUITE_CALENDAR_JSON_URL, init);
    if (!res.ok) return [];
    return (await res.json()) as ChurchSuiteEvent[];
  } catch {
    return [];
  }
}
