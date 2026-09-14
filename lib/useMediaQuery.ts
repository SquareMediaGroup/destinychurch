"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a CSS media query synchronously, staying subscribed to changes.
 *
 * The obvious `useState(false)` plus an effect that flips it is subtly wrong
 * whenever a component branches its tree on the result: React mounts the
 * "false" branch first, then swaps to a completely different tree, unmounting
 * and recreating everything inside it. useSyncExternalStore reads the query
 * during the first client render instead, so only one tree is ever mounted.
 *
 * getServerSnapshot returns false so SSR and the hydrating render agree; the
 * real value arrives in the same commit React hydrates in.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
