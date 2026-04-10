"use client";

import { useEffect } from "react";
import type { YTVideo } from "@/lib/youtube";
import SermonCard from "@/components/sermons/SermonCard";
import { useSermonSearch } from "@/lib/sermonSearchContext";

interface SermonGridProps {
  videos: YTVideo[];
}

export default function SermonGrid({ videos }: SermonGridProps) {
  const { query, setTitles } = useSermonSearch();

  useEffect(() => {
    setTitles(videos.map((v) => v.title).filter(Boolean));
  }, [videos, setTitles]);

  const filtered = query.trim()
    ? videos.filter((v) =>
        v.title.toLowerCase().includes(query.trim().toLowerCase())
      )
    : videos;

  return (
    <div>
      {query.trim() && (
        <p className="mb-6 text-xs text-white/40">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>
      )}

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
          </svg>
          <p className="text-base font-bold text-white/50">No sermons found</p>
          <p className="mt-1 text-sm text-white/30">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
