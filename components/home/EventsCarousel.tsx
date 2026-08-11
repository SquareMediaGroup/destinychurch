"use client";

import { useRef, useEffect, useState, useCallback } from "react";

/**
 * Vertical breathing room inside the scroll track.
 *
 * `overflow-x-auto` clips the cross axis too, so without this the cards'
 * `hover:-translate-y-1` lift and their drop shadows get sliced off at the top
 * and bottom edges of the track. The two values differ because the card's
 * shadow does: 4px of lift and a 2px shadow above, against a ~40px-tall shadow
 * below.
 */
const TRACK_PAD_TOP = "pt-3";
const TRACK_PAD_BOTTOM = "pb-10";

export default function EventsCarousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scroll = (dir: "left" | "right") => {
    const amount = window.innerWidth < 640 ? 260 : 320;
    scrollRef.current?.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  /**
   * `top-3 bottom-10 my-auto` centres each arrow on the *cards* rather than on
   * the padded track. A plain `top-1/2 -translate-y-1/2` splits the asymmetric
   * shadow padding evenly and drops the arrows ~14px below the card midline.
   * The insets mirror TRACK_PAD_TOP/BOTTOM.
   */
  const arrowBase =
    "absolute top-3 bottom-10 my-auto z-10 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/80 text-destiny-grey/50 shadow-sm backdrop-blur-sm transition-all duration-200 hover:text-destiny-grey sm:h-9 sm:w-9";

  return (
    <div className="relative">
      {/* Left arrow */}
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className={`${arrowBase} -left-1 sm:-left-3 ${
          canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Scrollable track. The negative margin matches the section container's
          padding at every breakpoint — at `lg` the container switches to px-8,
          so a fixed -mx-4 left the bleed 16px short of the edge. */}
      <div
        ref={scrollRef}
        className={`scrollbar-hide -mx-4 flex gap-5 overflow-x-auto px-4 lg:-mx-8 lg:px-8 ${TRACK_PAD_TOP} ${TRACK_PAD_BOTTOM}`}
      >
        {children}
      </div>

      {/* Right arrow */}
      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className={`${arrowBase} -right-1 sm:-right-3 ${
          canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
