/**
 * Opening the church's address in whatever map app the visitor's device has.
 *
 * The address itself is NOT defined here — `lib/churchInfo.ts` owns it, and
 * this module derives from that. What lives here is the part churchInfo has no
 * opinion on: which map *app* to send someone to.
 *
 * churchInfo's `MAPS_URL` and `DIRECTIONS_URL` are both Google, which is the
 * right default but wrong on Apple hardware, where Google Maps often isn't
 * installed and a google.com link strands the visitor in a browser instead of
 * the map app they actually use. So:
 *
 * - Google's `maps/search/?api=1` URL is the cross-platform default. It's a
 *   plain https link, so it works on desktop, and Android/iOS hand it to the
 *   Google Maps app when that app is installed.
 * - `maps.apple.com` is the equivalent on Apple platforms. It degrades to a web
 *   map elsewhere, so it's never a dead end.
 *
 * The query is the postal address with the street number and no venue name,
 * even where the UI prints the venue name — a map app given "Destiny Centre"
 * searches for a place by that name and can land anywhere, while a street
 * address geocodes to the building.
 */

import { ADDRESS } from "@/lib/churchInfo";

/**
 * What map apps are handed: street number, no venue name. Built from
 * `churchInfo`'s ADDRESS so it can't drift from what the site displays.
 */
export const DESTINY_CENTRE_MAP_QUERY = `${ADDRESS.street}, ${ADDRESS.locality}, ${ADDRESS.postcode}`;

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
