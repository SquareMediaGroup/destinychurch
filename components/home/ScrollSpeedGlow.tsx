"use client";

import { useEffect } from "react";

/**
 * Drives `--border-spin-duration` on all `.glowing-gradient-border` elements
 * based on the user's scroll velocity. Default (idle) duration is 9.6s per
 * revolution; peak speed caps at ~1.6s when the user scrolls fast. Velocity
 * decays smoothly when scrolling stops, so the ring eases back to idle.
 *
 * Also uses IntersectionObserver to tag off-screen cards with `.is-offscreen`
 * so their CSS animation is paused — keeps the rotating conic-gradient and
 * its blurred ::after glow from costing GPU time when the user can't see them.
 */
export default function ScrollSpeedGlow() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const IDLE_DURATION = 9.6; // seconds per revolution at rest
    const MAX_DURATION = 1.6; // seconds per revolution at peak scroll speed
    const PEAK_VELOCITY = 2500; // px/sec — scroll speed that saturates the effect
    const DECAY_PER_SECOND = 3.5; // higher = velocity fades faster when you stop

    // --- Scroll velocity → --border-spin-duration ---------------------------

    let lastY = window.scrollY;
    let lastScrollTime = performance.now();
    let velocityPxPerSec = 0;
    let lastTick = performance.now();
    let rafId = 0;

    const handleScroll = () => {
      const now = performance.now();
      const dt = now - lastScrollTime;
      const dy = Math.abs(window.scrollY - lastY);
      if (dt > 0) {
        const instantaneous = (dy / dt) * 1000; // px/sec
        // Blend toward the new sample to smooth out noisy wheel ticks
        velocityPxPerSec = Math.max(velocityPxPerSec * 0.6, instantaneous);
      }
      lastY = window.scrollY;
      lastScrollTime = now;
    };

    const tick = (now: number) => {
      const dt = Math.max((now - lastTick) / 1000, 0);
      lastTick = now;

      // Exponential decay toward 0 when there is no scroll input
      velocityPxPerSec *= Math.exp(-DECAY_PER_SECOND * dt);

      const t = Math.min(velocityPxPerSec / PEAK_VELOCITY, 1);
      const duration = IDLE_DURATION + (MAX_DURATION - IDLE_DURATION) * t;

      document.documentElement.style.setProperty(
        "--border-spin-duration",
        `${duration.toFixed(3)}s`
      );

      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    rafId = requestAnimationFrame(tick);

    // --- Pause animation when off-screen ------------------------------------

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".glowing-gradient-border")
    );
    // Start paused; observer will un-pause once a card enters the viewport.
    cards.forEach((el) => el.classList.add("is-offscreen"));

    let observer: IntersectionObserver | null = null;
    if (cards.length > 0 && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            entry.target.classList.toggle("is-offscreen", !entry.isIntersecting);
          }
        },
        { rootMargin: "100px" } // small pre-roll so it's already running when you scroll to it
      );
      cards.forEach((el) => observer!.observe(el));
    } else {
      // No IO support — just leave them visible/animating.
      cards.forEach((el) => el.classList.remove("is-offscreen"));
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
      document.documentElement.style.removeProperty("--border-spin-duration");
      observer?.disconnect();
      cards.forEach((el) => el.classList.remove("is-offscreen"));
    };
  }, []);

  return null;
}
