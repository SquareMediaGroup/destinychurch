"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { useAccessibility } from "@/contexts/AccessibilityContext";

export interface SlideshowPhoto {
  src: string;
  /** Empty string for purely decorative photos. */
  alt: string;
}

interface Props {
  photos: SlideshowPhoto[];
  /** next/image `sizes` hint for the frame's rendered width. */
  sizes?: string;
  /** Extra classes for the frame, e.g. a different corner radius. */
  className?: string;
}

// Kept long on purpose: this sits beside body copy, so it should read as a
// photo that occasionally changes, not as something moving.
const SLIDE_MS = 12000;

/**
 * One 4:3 frame that slowly crossfades between photos. Replaces the bento
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
    <div className={`relative aspect-[4/3] w-full overflow-hidden bg-[#f5f7fa] ${className}`}>
      {photos.map((photo, i) => (
        <Image
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          className={`object-cover transition-opacity duration-[1400ms] ease-in-out ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i === current ? undefined : true}
        />
      ))}

      {photos.length > 1 && (
        <div className="absolute bottom-3 left-3 flex items-center rounded-full bg-black/45 pl-1 pr-2 backdrop-blur-sm">
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              className="flex h-8 w-8 items-center justify-center text-white/90 hover:text-white"
            >
              <Icon name={paused ? "play_arrow" : "pause"} filled size="sm" />
            </button>
          )}
          {/* Padding on the button, not the bar, so each dot is a usable tap
              target without the indicator itself getting any heavier. */}
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-current={i === current ? "true" : undefined}
              className="group px-1 py-3"
            >
              <span
                className={`block h-1.5 rounded-full bg-white transition-all duration-300 ${
                  i === current ? "w-5 opacity-100" : "w-1.5 opacity-60 group-hover:opacity-90"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
