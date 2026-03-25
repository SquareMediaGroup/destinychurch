"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { YTVideo } from "@/lib/youtube";
import { formatDuration } from "@/lib/youtube";

interface FeaturedSlideshowProps {
  slides: YTVideo[];
}

export default function FeaturedSlideshow({ slides }: FeaturedSlideshowProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setActive((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [paused, next, slides.length]);

  if (!slides.length) return null;

  const slide = slides[active];

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{ height: "clamp(340px, 50vw, 520px)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background slides */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          <Image
            src={`https://i.ytimg.com/vi/${s.id}/maxresdefault.jpg`}
            alt={s.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority={i === 0}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex h-full items-end pb-12 sm:pb-16">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
          <div className="max-w-2xl">
            {active === 0 && (
              <span className="mb-3 inline-block rounded-full bg-destiny-orange px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Latest Sermon
              </span>
            )}
            <h2
              key={slide.id + "-title"}
              className="mb-2 text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl lg:text-5xl"
            >
              {slide.title}
            </h2>
            <div className="mb-5 flex items-center gap-3 text-xs text-white/50 sm:text-sm">
              {slide.publishedAt && (
                <span>
                  {new Date(slide.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
              {slide.duration && <span>· {formatDuration(slide.duration)}</span>}
            </div>
            <Link
              href={`/sermons/${slide.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 sm:px-6 sm:py-3 sm:text-base"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Now
            </Link>
          </div>
        </div>
      </div>

      {/* Arrow buttons */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/70 backdrop-blur-sm transition hover:bg-black/50 hover:text-white sm:left-5"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/70 backdrop-blur-sm transition hover:bg-black/50 hover:text-white sm:right-5"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-6">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active ? "w-6 bg-destiny-orange" : "w-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
