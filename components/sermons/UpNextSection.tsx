"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

type SortOption = "newest" | "oldest";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

interface UpNextSectionProps {
  videos: Video[];
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function UpNextSection({ videos }: UpNextSectionProps) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [filter, setFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      el.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [updateScroll]);

  const scroll = (dir: "left" | "right") => {
    const amount = window.innerWidth < 640 ? 220 : 280;
    scrollRef.current?.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  const processed = useMemo(() => {
    let result = [...videos];

    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      result = result.filter((v) => v.title.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return sort === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [videos, sort, filter]);

  return (
    <section>
      {/* Header with controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-white">Up Next</h2>
        <div className="flex items-center gap-3">
          {/* Filter input */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search sermons..."
              className="w-36 rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/30 backdrop-blur-sm transition focus:border-destiny-orange/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-destiny-orange/20 sm:w-auto sm:text-sm"
            />
          </div>
          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="appearance-none rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white backdrop-blur-sm transition focus:border-destiny-orange/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-destiny-orange/20 sm:text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Horizontal scrollable row */}
      {processed.length > 0 ? (
        <div className="relative">
          {/* Left arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="absolute -left-1 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div ref={scrollRef} className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 pb-4 sm:gap-4">
            {processed.map((rec) => (
              <Link
                key={rec.id}
                href={`/sermons/${rec.id}`}
                className="group w-[200px] flex-shrink-0 rounded-xl p-2 transition hover:bg-[#272727] sm:w-[260px]"
              >
                <div
                  className="relative overflow-hidden rounded-xl"
                  style={{ aspectRatio: "16/9" }}
                >
                  <Image
                    src={rec.thumbnail}
                    alt={rec.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 200px, 260px"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-white sm:text-sm">
                  {rec.title}
                </p>
                <p className="mt-1 text-[10px] text-white/50 sm:text-xs">{fmtDate(rec.publishedAt)}</p>
              </Link>
            ))}
          </div>

          {/* Right arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="absolute -right-1 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-white/40">
          No sermons match your filter
        </p>
      )}
    </section>
  );
}
