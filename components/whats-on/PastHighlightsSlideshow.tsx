"use client";

import { useState } from "react";

type Video = {
  videoId: string;
  title: string;
  thumbnail: string;
};

export default function PastHighlightsSlideshow({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  if (videos.length === 0) return null;

  const current = videos[active];

  const prev = () => { setPlaying(false); setActive((i) => (i - 1 + videos.length) % videos.length); };
  const next = () => { setPlaying(false); setActive((i) => (i + 1) % videos.length); };
  const select = (i: number) => { setPlaying(false); setActive(i); };

  return (
    <div>
      {/* Featured video */}
      <div className="relative mb-4 w-full overflow-hidden rounded-2xl aspect-video bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&rel=0`}
            title={current.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 w-full"
            aria-label={`Play ${current.title}`}
          >
            <img
              src={current.thumbnail}
              alt={current.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition group-hover:bg-white/30">
                <svg className="h-7 w-7 translate-x-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Title + nav arrows */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Past Highlight</p>
                <h3 className="mt-1 max-w-lg text-lg font-black text-white line-clamp-2 md:text-xl">
                  {current.title}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition hover:bg-white/40"
                  aria-label="Previous"
                >
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition hover:bg-white/40"
                  aria-label="Next"
                >
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Thumbnail strip — shows 5 at a time, scrollable */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {videos.map((v, i) => (
          <button
            key={v.videoId}
            onClick={() => select(i)}
            className={`relative aspect-video w-[calc((100%-4*0.75rem)/5)] shrink-0 overflow-hidden rounded-xl transition ${
              i === active ? "ring-2 ring-destiny-orange ring-offset-2" : "opacity-60 hover:opacity-100"
            }`}
          >
            <img
              src={v.thumbnail}
              alt={v.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
