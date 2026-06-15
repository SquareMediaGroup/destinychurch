"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface PlaceGroup {
  title: string;
  href: string;
  image: string;
  description: string;
}

const AUTO_MS = 6000;
const GAP = 24; // px — matches the section's gap-6 rhythm

// Aggressive ease-in-out: slow at both ends, decisive through the middle.
const EASE = "ease-[cubic-bezier(0.9,0,0.1,1)]";

export default function EveryoneHasAPlaceCarousel({
  groups,
}: {
  groups: PlaceGroup[];
}) {
  const n = groups.length;
  // Triple the slides so a full set always flanks the active card (the peeks are
  // never empty). We keep `index` inside the middle copy and, after each move
  // that carries it into an outer copy, snap by `n` with the transition off —
  // same content, same on-screen position, so the wrap is invisible.
  const slides = [...groups, ...groups, ...groups];

  const [index, setIndex] = useState(n); // first real slide, middle copy
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Card width as a % of the viewport. 60% → exactly ⅓ of each neighbour peeks
  // on desktop; a wider card on small screens keeps the caption legible.
  const fracPct = isDesktop ? 60 : 82;
  const peekPct = (100 - fracPct) / 2;
  // Centre the active card. translateX % is relative to the track's own width
  // (= viewport, since the track is w-full and its cards overflow), so the math
  // needs no pixel measurement; only the cumulative gaps are added in px.
  const transform = `translateX(calc(${peekPct - index * fracPct}% - ${index * GAP}px))`;

  const move = useCallback((dir: number) => {
    setAnimate(true);
    setIndex((i) => i + dir);
  }, []);

  const realActive = ((index % n) + n) % n;

  // Jump to a specific real slide by the shortest path around the ring.
  const goToReal = useCallback(
    (j: number) => {
      setAnimate(true);
      setIndex((i) => {
        let delta = j - (((i % n) + n) % n);
        if (delta > n / 2) delta -= n;
        if (delta < -n / 2) delta += n;
        return i + delta;
      });
    },
    [n]
  );

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setIsDesktop(desktop.matches);
      setReducedMotion(motion.matches);
    };
    apply();
    desktop.addEventListener("change", apply);
    motion.addEventListener("change", apply);
    return () => {
      desktop.removeEventListener("change", apply);
      motion.removeEventListener("change", apply);
    };
  }, []);

  // Auto-advance forever, one card at a time. Pauses on hover/focus and stands
  // down entirely when the user prefers reduced motion.
  useEffect(() => {
    if (reducedMotion || paused) return;
    const t = setTimeout(() => move(1), AUTO_MS);
    return () => clearTimeout(t);
  }, [index, paused, reducedMotion, move]);

  // Seamless wrap: once a move's animation finishes in an outer copy, snap back
  // by `n` with the transition off. Only react to the track's own transform end
  // (transitionend bubbles from children — dim/glass — so filter precisely).
  const onTrackTransitionEnd = (e: React.TransitionEvent) => {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (index >= 2 * n) {
      setAnimate(false);
      setIndex(index - n);
    } else if (index < n) {
      setAnimate(false);
      setIndex(index + n);
    }
  };

  // Reduced motion has no transition (so no transitionend) — keep the index
  // bounded eagerly instead. The jump is instant either way.
  useEffect(() => {
    if (!reducedMotion) return;
    if (index >= 2 * n) setIndex(index - n);
    else if (index < n) setIndex(index + n);
  }, [index, reducedMotion, n]);

  // Re-enable the transition a frame after a seamless snap (double rAF so the
  // no-transition reposition paints first and never animates).
  useEffect(() => {
    if (animate) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [animate]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    }
  };

  const motionOn = animate && !reducedMotion;
  const trackTransition = motionOn ? `transition-transform duration-700 ${EASE}` : "";
  const dimTransition = motionOn ? `transition-opacity duration-700 ${EASE}` : "";

  return (
    <div
      className="relative"
      role="group"
      aria-roledescription="carousel"
      aria-label="Everyone has a place"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      {/* Viewport — clips the horizontal peeks; vertical padding keeps card and
          glass shadows from being cropped. */}
      <div className="overflow-hidden py-4">
        <div
          className={`flex gap-6 will-change-transform ${trackTransition}`}
          style={{ transform }}
          onTransitionEnd={onTrackTransitionEnd}
        >
          {slides.map((group, p) => {
            const isActive = p === index;
            // Only the visible cards carry the costly SVG refraction; off-screen
            // clones fall back to the cheap blur (refraction is invisible there).
            const near = Math.abs(p - index) <= 1;
            return (
              <div
                key={p}
                className="relative shrink-0"
                style={{ flexBasis: `${fracPct}%`, width: `${fracPct}%` }}
                aria-roledescription="slide"
                aria-hidden={!isActive}
                aria-label={`${(p % n) + 1} of ${n}: ${group.title}`}
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-2xl">
                  <Image
                    src={group.image}
                    alt={group.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 82vw, 60vw"
                  />
                  {/* Base gradient for caption legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  {/* Dim peeking cards so the centred one leads the eye */}
                  <div
                    className={`absolute inset-0 bg-black/55 ${dimTransition} ${
                      isActive ? "opacity-0" : "opacity-100"
                    }`}
                  />

                  {/* Glass caption — refracts the photo behind it */}
                  <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6">
                    <div
                      className={`glass glass-strong glass-menu-legible rounded-2xl p-4 sm:p-5 ${
                        near ? "glass-refract" : ""
                      }`}
                    >
                      <h3 className="text-lg font-black uppercase tracking-tight text-white sm:text-2xl">
                        {group.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/85 sm:mt-2">
                        {group.description}
                      </p>
                      {isActive && (
                        <Link
                          href={group.href}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:text-destiny-orange sm:mt-4"
                        >
                          Explore
                          <span aria-hidden="true">&rarr;</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Inactive cards: full-card button slides this slide to centre.
                      Active card has no overlay, so its Explore link stays clickable.
                      tabIndex -1 keeps the cloned cards out of the tab order. */}
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setAnimate(true);
                        setIndex(p);
                      }}
                      aria-label={`Show ${group.title}`}
                      tabIndex={-1}
                      className="absolute inset-0 z-10 cursor-pointer"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prev / next — always enabled (the loop never ends) */}
      <button
        type="button"
        onClick={() => move(-1)}
        aria-label="Previous"
        className="glass glass-strong glass-refract glass-pill absolute left-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-white transition-opacity duration-200 hover:opacity-90 sm:left-3 sm:h-12 sm:w-12"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        aria-label="Next"
        className="glass glass-strong glass-refract glass-pill absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-white transition-opacity duration-200 hover:opacity-90 sm:right-3 sm:h-12 sm:w-12"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots */}
      <div className="mt-6 flex justify-center gap-2">
        {groups.map((group, j) => (
          <button
            key={group.title}
            type="button"
            onClick={() => goToReal(j)}
            aria-label={`Go to ${group.title}`}
            aria-current={j === realActive}
            className={`h-2 rounded-full ${
              reducedMotion ? "" : `transition-all duration-500 ${EASE}`
            } ${j === realActive ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
          />
        ))}
      </div>
    </div>
  );
}
