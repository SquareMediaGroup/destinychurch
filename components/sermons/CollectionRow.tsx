"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { YTVideo } from "@/lib/youtube";

interface CollectionRowProps {
  title: string;
  description?: string | null;
  videos: YTVideo[];
}

export default function CollectionRow({ title, description, videos }: CollectionRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [update]);

  const scroll = (dir: "left" | "right") => {
    const amount = window.innerWidth < 640 ? 220 : 300;
    scrollRef.current?.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  if (!videos.length) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 px-1">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-white/40">{description}</p>}
      </div>

      <div className="relative group/row">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 opacity-0 backdrop-blur-sm transition group-hover/row:opacity-100 hover:bg-white/20 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div ref={scrollRef} className="scrollbar-hide flex gap-3 overflow-x-auto pb-2 sm:gap-4">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/sermons/${video.id}`}
              className="group w-[180px] flex-shrink-0 sm:w-[240px]"
            >
              <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: "16/9" }}>
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 180px, 240px"
                />
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                {video.duration && (
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {video.duration}
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-sm">
                {video.title}
              </p>
            </Link>
          ))}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 opacity-0 backdrop-blur-sm transition group-hover/row:opacity-100 hover:bg-white/20 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
