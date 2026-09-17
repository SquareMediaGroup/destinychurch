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
 * Both take a free-text address rather than coordinates: the address is what
 * the footer shows, and letting the map app geocode it keeps the two in sync.
 */

/** The address as it should be handed to a map app (and as the footer prints it). */
export const DESTINY_CENTRE_ADDRESS =
  "395 Norton Road, Stockton-on-Tees, TS20 2QQ";

/** Google Maps search URL — the cross-platform default. */
export function googleMapsUrl(query: string = DESTINY_CENTRE_ADDRESS): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Apple Maps search URL — opens Apple Maps on iOS/iPadOS/macOS. */
export function appleMapsUrl(query: string = DESTINY_CENTRE_ADDRESS): string {
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
export function deviceMapsUrl(query: string = DESTINY_CENTRE_ADDRESS): string {
  return isApplePlatform() ? appleMapsUrl(query) : googleMapsUrl(query);
}
