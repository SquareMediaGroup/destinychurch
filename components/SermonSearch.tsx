"use client";

import { useMemo, useState } from "react";
import SermonCard from "./SermonCard";
import { Sermon } from "@/lib/types";

type SermonSearchProps = {
  sermons: Sermon[];
};

const matchSermon = (sermon: Sermon, query: string) => {
  const haystack = [
    sermon.title,
    sermon.speaker,
    sermon.summary,
    sermon.transcript,
    sermon.tags?.join(" "),
    sermon.youtubeVideoId,
    sermon.podcastGuid,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
};

export default function SermonSearch({ sermons }: SermonSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return sermons;
    return sermons.filter((sermon) => matchSermon(sermon, trimmed));
  }, [query, sermons]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xl">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-destiny-grey/70">
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, speaker, summary, or transcript"
            aria-label="Search sermons"
            enterKeyHint="search"
            className="w-full rounded-full border border-black/10 bg-[var(--surface)] px-10 py-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
          />
        </div>
        <div className="text-sm font-semibold text-destiny-grey/80">
          Showing {results.length} of {sermons.length}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-black/5 bg-destiny-grey/5 px-4 py-6 text-sm text-destiny-grey">
          No sermons match “{query}”. Try a different name, date, or speaker.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((sermon, index) => (
            <SermonCard
              key={sermon.id}
              sermon={sermon}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}
