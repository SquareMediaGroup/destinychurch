"use client";

import { useSyncExternalStore } from "react";

/**
 * Height in CSS pixels that the on-screen keyboard covers at the bottom of the
 * window, or 0 when it is closed.
 *
 * `position: fixed` is resolved against the *layout* viewport, which iOS Safari
 * does not shrink when the keyboard opens. A bottom-anchored sheet or toolbar
 * therefore sits underneath the keyboard, hiding exactly the input the admin
 * just tapped. Offsetting by this value keeps it above.
 *
 * Read from `visualViewport`, which is the only API that reports the keyboard
 * at all. Browsers without it (and every server render) get 0, which is the
 * pre-existing behaviour.
 */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  viewport.addEventListener("resize", onChange);
  viewport.addEventListener("scroll", onChange);
  return () => {
    viewport.removeEventListener("resize", onChange);
    viewport.removeEventListener("scroll", onChange);
  };
}

function snapshot(): number {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const inset = window.innerHeight - viewport.height - viewport.offsetTop;
  /*
   * Thresholded, and rounded, deliberately.
   *
   * Collapsing the URL bar and pinch-zooming both move the visual viewport by a
   * few pixels continuously. Reacting to those would jitter the toolbar on every
   * scroll frame, and an unrounded value would hand useSyncExternalStore a new
   * number each call — which React treats as a changed snapshot and re-renders
   * for. Only a keyboard is ever this tall.
   */
  return inset > 120 ? Math.round(inset) : 0;
}
