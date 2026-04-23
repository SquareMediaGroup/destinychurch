"use client";

import { useEffect } from "react";

/**
 * Drives `--border-spin-duration` on all `.glowing-gradient-border` elements
 * based on the user's scroll velocity. Default (idle) duration is 9.6s per
 * revolution; peak speed caps at ~1.6s when the user scrolls fast. Velocity
 * decays smoothly when scrolling stops, so the ring eases back to idle.
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

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
      document.documentElement.style.removeProperty("--border-spin-duration");
    };
  }, []);

  return null;
}
