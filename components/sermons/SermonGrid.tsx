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
        <span className="material-symbols-rounded pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-destiny-grey/40">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sermons..."
          className="w-full rounded-full border border-black/10 bg-white py-3 pl-11 pr-5 text-sm text-destiny-grey shadow-sm placeholder:text-destiny-grey/40 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
        />
      </div>

      {/* Result count */}
      <p className="mb-6 text-xs text-destiny-grey/50">
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
          <span className="material-symbols-rounded mb-4 text-5xl text-destiny-grey/25">
            search_off
          </span>
          <p className="text-base font-bold text-destiny-grey/50">No sermons found</p>
          <p className="mt-1 text-sm text-destiny-grey/30">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
