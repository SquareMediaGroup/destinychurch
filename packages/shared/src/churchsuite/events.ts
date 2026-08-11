// ChurchSuite public calendar feed — shared types + logic.
//
// Destiny exposes its calendar as an unauthenticated JSON embed (no API key),
// already used across the web app and reused by the app BFF. The web pages add
// their own Next.js `{ next: { revalidate } }` caching when calling
// `fetchChurchSuiteEvents`; the BFF applies its own short-TTL cache. This module
// stays framework-agnostic.

/**
 * One sized variant inside `images`. Note the URL lives on `.url` — the sibling
 * `original_*` keys are bare strings, these are objects. Confusing the two puts
 * an object where a URL string is expected.
 */
export type ChurchSuiteImageVariant = {
  px: number;
  square: boolean;
  mtime: number;
  url: string;
};

/**
 * The `images` payload. ChurchSuite sends an empty *array* (not null, not `{}`)
 * when an event has no artwork, so every read must guard with `Array.isArray`
 * — use `eventImage` rather than reaching in directly.
 */
export type ChurchSuiteImages = {
  thumb?: ChurchSuiteImageVariant;
  sm?: ChurchSuiteImageVariant;
  md?: ChurchSuiteImageVariant;
  lg?: ChurchSuiteImageVariant;
  original_16?: string;
  original_100?: string;
  original_500?: string;
  original_1000?: string;
  square_16?: string;
  square_100?: string;
};

/** A single event as returned by the ChurchSuite calendar JSON embed. */
export type ChurchSuiteEvent = {
  id: number;
  name: string;
  datetime_start: string;
  datetime_end: string;
  /**
   * The series key. Every occurrence of a recurring event shares one value;
   * one-offs are null. Group by `sequence ?? id` — grouping by name merges
   * unrelated series that happen to share a title.
   */
  sequence?: number | null;
  /** HTML, not plain text. Blank on most recurring services. */
  description?: string | null;
  category?: { id: number; name: string; color: string } | null;
  /** "confirmed" in practice; ChurchSuite also supports pending/cancelled. */
  status?: string;
  public_visible?: boolean;
  /** Null on every event in the feed today, but the field is real. */
  capacity?: number | null;
  pin?: number;
  site?: { id: number; name: string; color?: string } | null;
  location?: {
    name?: string;
    /** Sometimes a full address, sometimes just a postcode. Often "". */
    address?: string;
    type?: string;
    url?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  images?: ChurchSuiteImages | [] | null;
  /** Unique per *occurrence*, not per series. The stable link/redirect key. */
  identifier?: string;
  /**
   * ChurchSuite sends "1" / "0" *strings* here, not booleans — use
   * `eventSignupUrl` rather than testing these fields directly.
   */
  signup_options?: {
    signup_enabled?: string | boolean;
    tickets?: { enabled?: string | boolean; url?: string } | null;
    public?: {
      visible?: boolean;
      enabled?: string | boolean;
      featured?: boolean;
    } | null;
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

/**
 * The best artwork URL for an event, or undefined when it has none.
 *
 * Guards the two shapes the feed actually uses: `images` is an empty *array*
 * for artwork-less events, and the `thumb/sm/md/lg` entries are objects whose
 * URL sits on `.url` (only the `original_*` keys are bare strings). Reaching in
 * directly is how you end up passing an object to an <img src>.
 */
export function eventImage(
  event: Pick<ChurchSuiteEvent, "images">,
  size: "card" | "hero" = "card",
): string | undefined {
  const images = event.images;
  if (!images || Array.isArray(images)) return undefined;
  return size === "hero"
    ? images.original_1000 ?? images.lg?.url ?? images.original_500 ?? images.md?.url
    : images.original_500 ?? images.md?.url ?? images.original_1000 ?? images.lg?.url;
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
 * Emoji, variation selectors, skin-tone modifiers, ZWJ joiners, regional
 * indicators and keycap marks.
 *
 * Deliberately NOT `\p{Emoji}` — that property also matches plain digits, `#`
 * and `*`, so it would eat "2026" out of an event name. `Extended_Pictographic`
 * only covers actual pictographs.
 */
const EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{FE0F}\u{FE0E}\u{20E3}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu;

/**
 * Strip emoji from ChurchSuite-authored copy. The site's convention is no emoji
 * in user-facing UI, and feed content is written in ChurchSuite where authors do
 * use them. Also tidies the whitespace a removed emoji leaves behind.
 */
/**
 * Typographic marks that Unicode classes as Extended_Pictographic but which are
 * legitimate copy, not emoji — "Alpha®" must keep its ®.
 */
const KEEP_MARKS = new Set(["©", "®", "™"]);

export function stripEmoji(text: string): string {
  return text
    .replace(EMOJI_PATTERN, (char) => (KEEP_MARKS.has(char) ? char : ""))
    .replace(/\s+/g, " ")
    // A removed trailing emoji can strand a space before punctuation.
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

/**
 * The event description as plain text. The feed returns HTML with links; promo
 * surfaces want a clean single paragraph, optionally clamped to `maxLength`.
 * Emoji are stripped before clamping so the limit counts visible characters.
 */
export function eventDescriptionText(
  event: ChurchSuiteEvent,
  maxLength?: number,
): string {
  const text = stripEmoji(
    (event.description ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&rsquo;/g, "'")
      .replace(/&quot;|&ldquo;|&rdquo;/g, '"'),
  );

  if (!maxLength || text.length <= maxLength) return text;
  // Trim back to a word boundary so the ellipsis doesn't land mid-word.
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:]$/, "")}…`;
}

/**
 * The outcome of a feed fetch, with failure distinguishable from emptiness.
 *
 * `{ ok: true, events: [] }` genuinely means "nothing on the calendar";
 * `{ ok: false }` means we could not reach or read ChurchSuite. The website
 * treats both the same (see `fetchChurchSuiteEvents` below), but the app BFF
 * has to tell them apart to satisfy the graceful-degradation requirement in
 * docs/mobile-app-scope.md §5.3 — an app showing "nothing on" during an outage
 * is worse than one saying "temporarily unavailable".
 */
export type ChurchSuiteFetchResult =
  | { ok: true; events: ChurchSuiteEvent[] }
  | { ok: false; reason: "network" | "http" | "parse"; statusCode?: number };

/**
 * Fetch and parse the ChurchSuite calendar feed, reporting failures.
 *
 * `init` is passed straight to `fetch`, so a Next.js caller can supply
 * `{ next: { revalidate: 300 } }` and the BFF can supply its own cache options.
 */
export async function fetchChurchSuiteEventsResult(
  init?: RequestInit,
): Promise<ChurchSuiteFetchResult> {
  let res: Response;
  try {
    res = await fetch(CHURCHSUITE_CALENDAR_JSON_URL, init);
  } catch {
    return { ok: false, reason: "network" };
  }

  if (!res.ok) return { ok: false, reason: "http", statusCode: res.status };

  try {
    const events = (await res.json()) as ChurchSuiteEvent[];
    // A feed that parses to something other than an array is a parse failure,
    // not an empty calendar — downstream code assumes it can iterate.
    if (!Array.isArray(events)) return { ok: false, reason: "parse" };
    return { ok: true, events };
  } catch {
    return { ok: false, reason: "parse" };
  }
}

/**
 * Fetch and parse the ChurchSuite calendar feed. Returns `[]` on any error or
 * non-OK response so callers can render a graceful empty/degraded state.
 *
 * Kept as the website's entry point: several callers (notably
 * `lib/events.server.ts`) are written around "empty index is also the degraded
 * state". New code that needs to tell those apart should call
 * `fetchChurchSuiteEventsResult` directly.
 */
export async function fetchChurchSuiteEvents(
  init?: RequestInit,
): Promise<ChurchSuiteEvent[]> {
  const result = await fetchChurchSuiteEventsResult(init);
  return result.ok ? result.events : [];
}
