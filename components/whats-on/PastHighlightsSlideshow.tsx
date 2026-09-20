"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Icon from "@/components/ui/Icon";

type Video = {
  videoId: string;
  title: string;
  thumbnail: string;
};

/**
 * Past highlight videos: one featured player plus a thumbnail strip.
 *
 * The previous structure put the prev/next buttons *inside* the big "play"
 * button. Nested interactive elements are invalid HTML, the inner buttons only
 * worked because each one called `stopPropagation`, and assistive tech has no
 * sensible way to present a button inside a button. They are siblings now, so
 * the event plumbing disappears with the nesting.
 */
export default function PastHighlightsSlideshow({
  videos,
}: {
  videos: Video[];
}) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const statusId = useId();

  if (videos.length === 0) return null;

  const current = videos[active];

  const prev = () => {
    setPlaying(false);
    setActive((i) => (i - 1 + videos.length) % videos.length);
  };
  const next = () => {
    setPlaying(false);
    setActive((i) => (i + 1) % videos.length);
  };
  const select = (i: number) => {
    setPlaying(false);
    setActive(i);
  };

  const navButton =
    "flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60";

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Past highlights"
    >
      {/* Featured video */}
      <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-panel bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&rel=0`}
            title={current.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <>
            <button
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 w-full"
              aria-label={`Play ${current.title}`}
            >
              <Image
                src={current.thumbnail}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition group-hover:bg-white/30">
                  <svg
                    className="h-7 w-7 translate-x-0.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>

              <span className="absolute inset-x-0 bottom-0 block p-5 pr-32 text-left">
                <span className="block text-xs font-bold uppercase tracking-widest text-on-dark-muted">
                  Past Highlight
                </span>
                <span className="mt-1 block max-w-lg text-lg font-black text-white line-clamp-2 md:text-xl">
                  {current.title}
                </span>
              </span>
            </button>

            {/* Siblings of the play button, not children. Placed after it in
                the DOM so they stack above without needing a z-index race. */}
            {videos.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end gap-2 p-5">
                <button
                  onClick={prev}
                  className={`pointer-events-auto ${navButton}`}
                  aria-label="Previous highlight"
                >
                  <Icon name="chevron_left" size="lg" />
                </button>
                <button
                  onClick={next}
                  className={`pointer-events-auto ${navButton}`}
                  aria-label="Next highlight"
                >
                  <Icon name="chevron_right" size="lg" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Where am I? The active thumbnail was previously indicated only by a
          ring, which says nothing to a screen reader and nothing at all once
          the strip is scrolled past it. */}
      {videos.length > 1 && (
        <p id={statusId} aria-live="polite" className="sr-only">
          {`Highlight ${active + 1} of ${videos.length}: ${current.title}`}
        </p>
      )}

      {/* Thumbnail strip.
          The width was hardcoded to five across at every breakpoint, which on a
          375px phone is a ~60px thumbnail — a desktop decision applied to
          mobile. It steps now: 2.5 visible on a phone, 5 from `sm` up, so the
          partial card also signals that the strip scrolls. */}
      <div
        role="group"
        aria-label="Choose a highlight"
        tabIndex={0}
        className="scrollbar-hide flex gap-3 overflow-x-auto pb-2"
      >
        {videos.map((v, i) => (
          <button
            key={v.videoId}
            onClick={() => select(i)}
            aria-current={i === active ? "true" : undefined}
            aria-label={v.title}
            className={`relative aspect-video w-[calc((100%-1.5rem)/2.5)] shrink-0 overflow-hidden rounded-xl transition sm:w-[calc((100%-4*0.75rem)/5)] ${
              i === active
                ? "ring-2 ring-destiny-orange ring-offset-2"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <Image
              src={v.thumbnail}
              alt=""
              fill
              sizes="(max-width: 640px) 40vw, 154px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
