"use client";

import { useEffect } from "react";

/**
 * Pauses `.glowing-gradient-border` cards when they scroll out of view, so the
 * rotating conic-gradient border (and its blurred ::after glow on desktop) stop
 * costing GPU time when they're off-screen.
 *
 * The animation itself runs at a constant CSS speed — no scroll-velocity
 * modulation. Name kept for backwards-compat with existing imports.
 */
export default function ScrollSpeedGlow() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) return;

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".glowing-gradient-border")
    );
    if (cards.length === 0) return;

    // Start paused; observer un-pauses as soon as a card enters the viewport.
    cards.forEach((el) => el.classList.add("is-offscreen"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("is-offscreen", !entry.isIntersecting);
        }
      },
      { rootMargin: "100px" } // small pre-roll so it's running when you reach it
    );
    cards.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      cards.forEach((el) => el.classList.remove("is-offscreen"));
    };
  }, []);

  return null;
}
