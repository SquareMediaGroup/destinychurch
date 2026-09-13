"use client";

import { useEffect } from "react";

/**
 * Holds `document.body` still while `active` is true.
 *
 * Body scroll is a single global that a dozen components here want to own at
 * once, and the hand-rolled copies fell into two traps. Most set
 * `overflow = ""` on the way out instead of putting back whatever was there, so
 * an inner modal closing would unlock a page its parent still meant to hold.
 * And because the value is global, the last unlock won regardless of who else
 * was still open.
 *
 * Counting the locks fixes both: the first one saves the real previous value,
 * and only the last one restores it.
 */
let lockCount = 0;
let previousOverflow = "";

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [active]);
}
