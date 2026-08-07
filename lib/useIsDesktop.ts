"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * True at the ≥1024px breakpoint, read synchronously.
 *
 * The admin editors branch their entire layout on this — a Modal on mobile, a
 * full-screen document surface on desktop. The obvious `useState(false)` plus
 * an effect that flips it to `true` is subtly wrong here: on desktop React
 * mounts the Modal branch first, then swaps to a completely different tree,
 * which unmounts and recreates the whole TipTap instance. That silently
 * discarded undo history on every open, and with content blocks it would also
 * drop the selected block and any in-flight inspector edit.
 *
 * useSyncExternalStore reads the media query during the first client render, so
 * only one tree is ever mounted. getServerSnapshot returns false so SSR and
 * that first client paint agree.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}
