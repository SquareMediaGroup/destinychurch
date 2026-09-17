"use client";

import type { ReactNode } from "react";
import { DESTINY_CENTRE_ADDRESS, deviceMapsUrl, googleMapsUrl } from "@/lib/maps";
import { useHydrated } from "@/lib/useHydrated";

interface MapsLinkProps {
  /** Free-text address handed to the map app. Defaults to the Destiny Centre. */
  query?: string;
  className?: string;
  /** Overrides the generated "Open … in maps" label when the wrapped text needs it. */
  "aria-label"?: string;
  children: ReactNode;
}

/**
 * Wraps an address in a link that opens it in the device's map app.
 *
 * The href starts as the Google Maps URL — that's what the server renders, and
 * it's the right answer on Android, Windows and Linux — then swaps to Apple Maps
 * once hydrated on an Apple device. Going through `useHydrated` (a
 * `useSyncExternalStore` snapshot) rather than checking the user agent during
 * render keeps the server and client markup identical at hydration time.
 *
 * `target="_blank"` because a map app taking over the tab would otherwise lose
 * the page the visitor was reading.
 */
export default function MapsLink({
  query = DESTINY_CENTRE_ADDRESS,
  className,
  "aria-label": ariaLabel,
  children,
}: MapsLinkProps) {
  const hydrated = useHydrated();
  const href = hydrated ? deviceMapsUrl(query) : googleMapsUrl(query);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel ?? `Open ${query} in maps`}
    >
      {children}
    </a>
  );
}
