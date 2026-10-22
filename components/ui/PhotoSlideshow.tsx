"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAccessibility } from "@/contexts/AccessibilityContext";

export interface SlideshowPhoto {
  src: string;
  /** Empty string for purely decorative photos. */
  alt: string;
  /** CSS object-position, for a portrait shot cropped into a landscape frame. */
  position?: string;
}

const RATIOS = {
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
} as const;

interface Props {
  photos: SlideshowPhoto[];
  /** next/image `sizes` hint for the frame's rendered width. */
  sizes?: string;
  /** Frame shape. 3/2 suits sets that are all straight-off-the-camera landscape shots. */
  ratio?: keyof typeof RATIOS;
  /** Extra classes for the frame, e.g. a different corner radius. */
  className?: string;
}

// Kept long on purpose: this sits beside body copy, so it should read as a
// photo that occasionally changes, not as something moving.
const SLIDE_MS = 12000;

/**
 * One 4:3 (or 3:2) frame that slowly crossfades between photos. Replaces the bento
 * photo grids (one wide shot over two squares, and the offset ImageMosaic)
 * that used to sit beside copy across the site.
 *
 * Under "Reduce animations" (or the OS setting) there is no auto-advance; the
 * dots keep every photo reachable either way, and the pause button covers
 * WCAG 2.2.2 for everyone else.
 */
export default function PhotoSlideshow({
  photos,
  sizes = "(max-width: 768px) 100vw, 50vw",
  ratio = "4/3",
  className = "rounded-3xl",
}: Props) {
  const { reducedMotion } = useAccessibility();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reducedMotion || paused || photos.length < 2) return;
    // `current` is a dependency so picking a dot restarts the full interval.
    const timer = setInterval(() => setCurrent((c) => (c + 1) % photos.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [reducedMotion, paused, current, photos.length]);

  return (
    <div className={`relative ${RATIOS[ratio]} w-full overflow-hidden bg-[#e8ecf1] ${className}`}>
      {photos.map((photo, i) => (
        <Image
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          style={photo.position ? { objectPosition: photo.position } : undefined}
          className={`object-cover transition-opacity duration-[1400ms] ease-in-out ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i === current ? undefined : true}
        />
      ))}

      {photos.length > 1 && (
        <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-[rgba(20,24,28,0.42)] py-1 pl-2.5 pr-1.5 backdrop-blur-md">
          {/* Padding on the button, not the bar, so each dot is a usable tap
              target without the indicator itself getting any heavier. */}
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-current={i === current ? "true" : undefined}
              className="flex h-7 items-center justify-center px-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
            >
              <span
                className={`block h-1.5 rounded-full transition-[width,background-color] duration-[400ms] ease-out ${
                  i === current ? "w-[22px] bg-destiny-orange" : "w-1.5 bg-white/70"
                }`}
              />
            </button>
          ))}
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
            >
              {paused ? (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <rect x="2.5" y="1.5" width="2.5" height="9" rx="0.8" fill="currentColor" />
                  <rect x="7" y="1.5" width="2.5" height="9" rx="0.8" fill="currentColor" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
