// Client-safe event helpers. Anything touching Supabase or the ChurchSuite
// fetch lives in lib/events.server.ts; this file is importable from client
// components.

/**
 * The three card treatments being trialled on /whats-on.
 *
 * `a` ships on the live pages. `a-pill` and `c` exist only so the preview
 * routes (/home and /whats-on/new) can be compared side by side — once a
 * variant is chosen the other two, and those routes, get deleted.
 */
export type EventCardVariant = "a" | "a-pill" | "c";

const VARIANTS: readonly EventCardVariant[] = ["a", "a-pill", "c"];

export function isEventCardVariant(value: unknown): value is EventCardVariant {
  return typeof value === "string" && (VARIANTS as readonly string[]).includes(value);
}

/** Read a `?card=` search param, falling back when it is absent or junk. */
export function parseCardVariant(
  value: string | string[] | undefined,
  fallback: EventCardVariant = "c",
): EventCardVariant {
  const first = Array.isArray(value) ? value[0] : value;
  return isEventCardVariant(first) ? first : fallback;
}

/** Slugs a real ChurchSuite event may not claim, because a route owns them. */
export const RESERVED_EVENT_SLUGS: ReadonlySet<string> = new Set([
  // /whats-on/new is the variant preview route; a static segment beats the
  // [slug] dynamic one, so an event slugging to "new" would be unreachable.
  // Remove this alongside app/whats-on/new/ once a card variant is picked.
  "new",
]);
