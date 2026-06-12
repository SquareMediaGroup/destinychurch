"use client";

import { useEffect } from "react";

/* Writes the pointer's position within the hovered `.glass` element into its
   --glass-mx/--glass-my custom properties, which drive the cursor-tracking
   bloom hotspot (.glass::after in globals.css). One delegated listener,
   rAF-throttled, direct style writes — no React re-renders. Skipped entirely
   on touch-only devices, where the hotspot never shows anyway. */
export default function GlassBloomTracker() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;

    let raf = 0;
    let last: PointerEvent | null = null;

    const onMove = (e: PointerEvent) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const ev = last;
        if (!ev) return;
        const target = ev.target as Element | null;
        const el = target?.closest?.(".glass") as HTMLElement | null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--glass-mx", `${ev.clientX - r.left}px`);
        el.style.setProperty("--glass-my", `${ev.clientY - r.top}px`);
      });
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
