"use client";

import { useState } from "react";
import type { YTVideo } from "@/lib/youtube";
import SermonCard from "@/components/sermons/SermonCard";

interface SermonGridProps {
  videos: YTVideo[];
}

export default function SermonGrid({ videos }: SermonGridProps) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? videos.filter((v) =>
        v.title.toLowerCase().includes(query.trim().toLowerCase())
      )
    : videos;

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sermons..."
          className="w-full rounded-full border border-white/10 bg-[#1e1e1e] py-3 pl-11 pr-5 text-sm text-white shadow-sm placeholder:text-white/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
        />
      </div>

      {/* Result count */}
      <p className="mb-6 text-xs text-white/40">
        Showing {filtered.length} sermon{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Grid or empty state */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((video) => (
            <SermonCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="mb-4 h-12 w-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6" />
          </svg>
          <p className="text-base font-bold text-white/50">No sermons found</p>
          <p className="mt-1 text-sm text-white/30">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
