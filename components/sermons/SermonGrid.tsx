"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { UploadedVideosPage, YTVideo } from "@/lib/youtube";
import SermonCard from "./SermonCard";

export default function SermonGrid({ initial }: { initial: UploadedVideosPage }) {
  const [videos, setVideos] = useState<YTVideo[]>(initial.videos);
  const [nextPageToken, setNextPageToken] = useState<string | null>(initial.nextPageToken);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => v.title.toLowerCase().includes(q));
  }, [videos, query]);

  const searching = query.trim().length > 0;

  // Auto-load the next page as the sentinel scrolls into view. Skipped while
  // searching — search filters what's already loaded, so scrolling to the
  // bottom of a filtered list shouldn't fetch unrelated further pages.
  useEffect(() => {
    if (searching || !nextPageToken || loading) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, nextPageToken, loading]);

  async function loadMore() {
    if (!nextPageToken || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sermons/more?pageToken=${encodeURIComponent(nextPageToken)}`
      );
      const page: UploadedVideosPage = await res.json();
      setVideos((prev) => [...prev, ...page.videos]);
      setNextPageToken(page.nextPageToken);
    } catch {
      // Leave nextPageToken as-is so the sentinel can retry on next scroll.
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-destiny-grey md:text-4xl">
            Every message
          </h2>
          <p className="mt-2 text-sm text-destiny-grey/55">
            {videos.length}
            {nextPageToken ? "+" : ""} messages and counting
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-rounded pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-destiny-grey/40">
            search
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sermons…"
            aria-label="Search sermons"
            className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-11 pr-4 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((video) => (
            <SermonCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl border border-black/[0.07] bg-[#f5f7fa] p-8 text-center text-sm text-destiny-grey/60">
          No sermons match “{query}”.
        </p>
      )}

      {/* Infinite-scroll sentinel + manual fallback */}
      {!searching && nextPageToken && (
        <div ref={sentinelRef} className="mt-10 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-destiny-grey/15 px-7 py-3 text-sm font-bold text-destiny-grey transition hover:border-destiny-grey/40 hover:bg-black/[0.03] disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
            {!loading && (
              <span className="material-symbols-rounded text-lg">expand_more</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
