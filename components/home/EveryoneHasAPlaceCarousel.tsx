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
const SIDE_SCALE = 0.84; // neighbours sit smaller + behind the active card
const SPACING = 56; // % of card width each neighbour is offset to the side

// Aggressive ease-in-out: slow at both ends, decisive through the middle.
const EASE = "ease-[cubic-bezier(0.9,0,0.1,1)]";
// Card footprint — portrait on phones so the caption has room, landscape up.
// Fractions shrink on wider viewports so the full-bleed neighbours show more.
const SIZE =
  "w-[86%] aspect-[5/6] sm:w-[64%] sm:aspect-[16/11] lg:w-[52%] lg:aspect-[16/10] xl:w-[44%]";

export default function EveryoneHasAPlaceCarousel({
  groups,
}: {
  groups: PlaceGroup[];
}) {
  const n = groups.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Modular index → the loop is infinite for free, no clones or snapping.
  const move = useCallback((dir: number) => setActive((a) => (a + dir + n) % n), [n]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Auto-advance forever; pauses on hover/focus and for reduced motion.
  useEffect(() => {
    if (reducedMotion || paused) return;
    const t = setTimeout(() => move(1), AUTO_MS);
    return () => clearTimeout(t);
  }, [active, paused, reducedMotion, move]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    }
  };

  const ease = reducedMotion ? "" : `transition-all duration-700 ${EASE}`;

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
      {/* Stage — clips side overflow; padding leaves room for card shadows. */}
      <div className="relative overflow-hidden px-2 py-6">
        {/* Invisible sizer establishes the stage height responsively. */}
        <div className={`mx-auto invisible ${SIZE}`} aria-hidden="true" />

        {groups.map((group, j) => {
          // Signed distance on the ring: 0 = active, ±1 = neighbours, ±2 hidden.
          const ring = (j - active + n) % n;
          const o = ring > n / 2 ? ring - n : ring;
          const abs = Math.abs(o);
          const isCenter = o === 0;
          const visible = abs <= 1;
          return (
            <div
              key={group.title}
              className={`absolute left-1/2 top-1/2 ${SIZE} ${ease}`}
              style={{
                transform: `translate(-50%, -50%) translateX(${o * SPACING}%) scale(${
                  isCenter ? 1 : SIDE_SCALE
                })`,
                zIndex: 30 - abs * 10,
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? "auto" : "none",
              }}
              aria-hidden={!isCenter}
            >
              <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
                <Image
                  src={group.image}
                  alt={group.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 86vw, 62vw"
                />
                {/* Base gradient for caption legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
                {/* Dim the neighbours so the centred card leads the eye */}
                <div
                  className={`absolute inset-0 bg-black/45 ${ease} ${
                    isCenter ? "opacity-0" : "opacity-100"
                  }`}
                />

                {/* Caption — only the centred card carries the costly refraction
                    (always at scale 1, so backdrop-filter stays crisp). It rises,
                    fades and zooms in as the card expands to centre. */}
                <div
                  className={`absolute inset-x-4 bottom-4 origin-bottom sm:inset-x-6 sm:bottom-6 ${ease} ${
                    isCenter
                      ? "translate-y-0 scale-100 opacity-100"
                      : "translate-y-5 scale-95 opacity-0"
                  }`}
                >
                  <div
                    className={`glass glass-menu-legible rounded-2xl p-4 sm:p-5 ${
                      isCenter ? "glass-refract" : ""
                    }`}
                    style={{ backgroundColor: "rgba(54, 63, 72, 0.4)" }}
                  >
                    <h3 className="text-lg font-black uppercase tracking-tight text-white sm:text-2xl">
                      {group.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-white/85 sm:mt-2 sm:line-clamp-none">
                      {group.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white sm:mt-4">
                      Explore
                      <span aria-hidden="true">&rarr;</span>
                    </span>
                  </div>
                </div>

                {/* Click target: centre navigates, neighbours slide to centre. */}
                {isCenter ? (
                  <Link
                    href={group.href}
                    aria-label={`Explore ${group.title}`}
                    className="absolute inset-0 z-10"
                  />
                ) : (
                  visible && (
                    <button
                      type="button"
                      onClick={() => setActive(j)}
                      aria-label={`Show ${group.title}`}
                      tabIndex={-1}
                      className="absolute inset-0 z-10 cursor-pointer"
                    />
                  )
                )}
              </div>
            </div>
          );
        })}

        {/* Prev / next — always enabled (the loop never ends) */}
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Previous"
          className="glass glass-strong glass-refract glass-pill absolute left-2 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-white transition-opacity duration-200 hover:opacity-90 sm:left-4 sm:h-12 sm:w-12"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Next"
          className="glass glass-strong glass-refract glass-pill absolute right-2 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-white transition-opacity duration-200 hover:opacity-90 sm:right-4 sm:h-12 sm:w-12"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dots */}
      <div className="mt-6 flex justify-center gap-2">
        {groups.map((group, j) => (
          <button
            key={group.title}
            type="button"
            onClick={() => setActive(j)}
            aria-label={`Go to ${group.title}`}
            aria-current={j === active}
            className={`h-2 rounded-full ${
              reducedMotion ? "" : `transition-all duration-500 ${EASE}`
            } ${j === active ? "w-8 bg-destiny-grey" : "w-2 bg-black/20 hover:bg-black/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
