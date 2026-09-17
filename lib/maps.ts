/**
 * Map deep-links for the Destiny Centre.
 *
 * "Open in maps" has no single URL that works everywhere, so we build two and
 * pick one at render time:
 *
 * - Google's `maps/search/?api=1` URL is the universal fallback. It's a plain
 *   https link, so it works on desktop, and Android/iOS hand it to the Google
 *   Maps app when that app is installed.
 * - `maps.apple.com` is the equivalent on Apple platforms, where Google Maps
 *   often isn't installed and the system map app is Apple Maps. It also degrades
 *   to a web map on non-Apple devices, so it's never a dead end.
 *
 * Both take free text rather than coordinates, and there are two strings for it
 * because what reads well and what geocodes well aren't the same:
 *
 * - `DESTINY_CENTRE_ADDRESS` is what the UI prints. It leads with the venue
 *   name, which is how people say where the church is.
 * - `DESTINY_CENTRE_MAP_QUERY` is what map apps are handed. It's the postal
 *   address with the street number and no venue name, so the app geocodes to
 *   the building instead of searching for "Destiny Centre" and landing on
 *   whatever it thinks that is.
 *
 * Keep the two pointing at the same place — they're the same building, written
 * for two different readers.
 */

/** The address as the UI prints it — venue name first. */
export const DESTINY_CENTRE_ADDRESS =
  "Destiny Centre, Norton Road, Stockton-on-Tees, TS20 2QQ";

/** The address as map apps should be given it — street number, no venue name. */
export const DESTINY_CENTRE_MAP_QUERY =
  "395 Norton Road, Stockton-on-Tees, TS20 2QQ";

/** Google Maps search URL — the cross-platform default. */
export function googleMapsUrl(query: string = DESTINY_CENTRE_MAP_QUERY): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Apple Maps search URL — opens Apple Maps on iOS/iPadOS/macOS. */
export function appleMapsUrl(query: string = DESTINY_CENTRE_MAP_QUERY): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}

/**
 * True on iOS, iPadOS and macOS. Browser-only — callers must be past hydration,
 * or the server render and the client render will disagree on the href.
 *
 * iPadOS reports itself as "Macintosh" with a touch screen, hence the
 * `maxTouchPoints` arm; `MSStream` rules out old Windows Phone IE, which lied
 * about being an iPhone.
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) &&
    !("MSStream" in (globalThis as Record<string, unknown>));
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const isMac = /Mac OS X/.test(ua);
  return isIOS || isIPadOS || isMac;
}

/** The right map URL for the device currently rendering. Google on the server. */
export function deviceMapsUrl(query: string = DESTINY_CENTRE_MAP_QUERY): string {
  return isApplePlatform() ? appleMapsUrl(query) : googleMapsUrl(query);
}
