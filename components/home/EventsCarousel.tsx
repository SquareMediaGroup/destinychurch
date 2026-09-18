"use client";

import { useRef, useEffect, useState, useCallback, useId } from "react";

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

export default function EventsCarousel({
  children,
  label = "Upcoming events",
}: {
  children: React.ReactNode;
  /** Names the scroll region for assistive tech. */
  label?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackId = useId();
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

  /**
   * Scroll by exactly one card.
   *
   * This used to be a hardcoded 260/320, which did not match the card width
   * plus the `gap-5` between them (280 + 20 = 300, not 260), so repeated
   * presses drifted and left cards straddling the gutter. Measuring the first
   * two children gives the real pitch and keeps working if a card size
   * changes.
   */
  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    const [first, second] = el.children as unknown as HTMLElement[];
    const pitch =
      first && second
        ? second.offsetLeft - first.offsetLeft
        : (first?.offsetWidth ?? el.clientWidth);

    el.scrollBy({ left: dir === "right" ? pitch : -pitch, behavior: "smooth" });
  };

  /**
   * `top-3 bottom-10 my-auto` centres each arrow on the *cards* rather than on
   * the padded track. A plain `top-1/2 -translate-y-1/2` splits the asymmetric
   * shadow padding evenly and drops the arrows ~14px below the card midline.
   * The insets mirror TRACK_PAD_TOP/BOTTOM.
   *
   * 44px square: these were 32px, under the minimum touch target, and sat at
   * `-left-1` where they overlapped the first card's edge.
   */
  const arrowBase =
    "absolute top-3 bottom-10 my-auto z-10 flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white/90 text-subtle shadow-sm backdrop-blur-sm transition-all duration-200 hover:text-destiny-grey";

  return (
    <div className="relative">
      {/* Left arrow */}
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        aria-controls={trackId}
        /* Hidden from the tab order when it cannot do anything — an arrow at
           opacity 0 is still focusable, and landing on an invisible control
           that does nothing is worse than not reaching it. */
        tabIndex={canScrollLeft ? undefined : -1}
        aria-hidden={canScrollLeft ? undefined : true}
        className={`${arrowBase} -left-2 sm:-left-3 ${
          canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Scrollable track. The negative margin matches the section container's
          padding at every breakpoint — at `lg` the container switches to px-8,
          so a fixed -mx-4 left the bleed 16px short of the edge.

          tabIndex={0} is the standard treatment for a scroll container: without
          it a keyboard user cannot scroll the track at all unless they happen
          to tab onto a card, and arrow keys do nothing. The role and label stop
          it being an anonymous div in the accessibility tree. */}
      <div
        ref={scrollRef}
        id={trackId}
        role="group"
        aria-label={label}
        tabIndex={0}
        className={`scrollbar-hide -mx-4 flex gap-5 overflow-x-auto px-4 lg:-mx-8 lg:px-8 ${TRACK_PAD_TOP} ${TRACK_PAD_BOTTOM}`}
      >
        {children}
      </div>

      {/* Right arrow */}
      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        aria-controls={trackId}
        tabIndex={canScrollRight ? undefined : -1}
        aria-hidden={canScrollRight ? undefined : true}
        className={`${arrowBase} -right-2 sm:-right-3 ${
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
