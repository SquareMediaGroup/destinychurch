// Reporting a tap from the browser, for the two surfaces where the click
// happens in the page rather than as a server redirect: the /nfc seat-back
// tiles and the /links Next Steps cards.
//
// `navigator.sendBeacon` rather than a plain fetch, because both callers either
// navigate away or open a modal the instant they are pressed, and an in-flight
// fetch would be cancelled by the navigation. The browser queues a beacon and
// delivers it regardless of what the page does next.
//
// The body goes as text/plain on purpose. `application/json` is not a
// CORS-safelisted content type, so sendBeacon can be refused outright with it;
// text/plain sidesteps the question entirely, and /api/track parses the body
// with request.text() + JSON.parse to match.
//
// Nothing is stored on the visitor's device — no cookie, no localStorage, no
// client-side visitor id. Everything that identifies the request is derived
// server-side from its headers.

import type { EngagementSource } from "@/lib/engagement";

/**
 * The two surfaces a browser is allowed to report.
 *
 * `redirect` is deliberately absent, and that is a security boundary rather
 * than an oversight: shortlink numbers are what decide whether printing a run
 * of flyers was worth it, so they may only ever come from the server-side path
 * in app/[slug]/page.tsx. If a browser could post them, anyone with curl could
 * make any flyer look like a success.
 */
export type BeaconSource = Extract<EngagementSource, "nfc" | "links">;

export const BEACON_SOURCES: BeaconSource[] = ["nfc", "links"];

export function isBeaconSource(value: unknown): value is BeaconSource {
  return value === "nfc" || value === "links";
}

const ENDPOINT = "/api/track";

/**
 * Record that someone tapped something. Fire-and-forget by design: it returns
 * nothing, throws nothing, and blocks nothing.
 */
export function trackClick(
  source: BeaconSource,
  targetKey: string,
  targetLabel?: string | null,
): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    source,
    targetKey,
    targetLabel: targetLabel ?? null,
  });

  try {
    const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
    if (navigator.sendBeacon?.(ENDPOINT, blob)) return;
  } catch {
    /* fall through to the fetch below */
  }

  // Fallback for browsers where sendBeacon is unavailable or refused (Safari
  // disables it under some Lockdown Mode and ITP configurations). `keepalive`
  // is what lets this outlive the navigation — the same approach
  // components/shop/ShopDiagnostics.tsx already uses for its reports.
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
    }).catch(() => {
      /* analytics must never surface an error of its own */
    });
  } catch {
    /* ignore */
  }
}
