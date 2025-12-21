"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sermon } from "@/lib/types";
import Icon from "./Icon";
import SermonCard from "./SermonCard";

type SermonSearchProps = {
  sermons: Sermon[];
};

export default function SermonSearch({ sermons }: SermonSearchProps) {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(queryParam);

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sermons;

    return sermons.filter((sermon) => {
      const haystack = [
        sermon.title,
        sermon.speaker,
        sermon.summary,
        sermon.transcript,
        sermon.tags?.join(" "),
        sermon.date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [query, sermons]);

  // Simple suggestions (top 5 titles that match prefix)
  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return sermons
      .filter((sermon) => sermon.title.toLowerCase().includes(needle))
      .slice(0, 5)
      .map((sermon) => sermon.title);
  }, [query, sermons]);

  const applySuggestion = (value: string) => setQuery(value);

  return (
    <section className="space-y-3">
      <div className="group flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 shadow-sm transition focus-within:border-destiny-orange">
        <Icon name="search" size={18} className="text-destiny-grey/70" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sermons by title or keywords"
          aria-label="Search sermons"
          enterKeyHint="search"
          className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-destiny-grey/70 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/80 transition hover:bg-destiny-grey/10"
            aria-label="Clear search"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-destiny-grey">
          <span className="font-semibold text-destiny-black">Suggestions:</span>
          {suggestions.map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => applySuggestion(title)}
              className="rounded-full border border-[var(--border-subtle)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
            >
              {title}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-destiny-grey">
          <Icon name="travel_explore" size={18} />
          <div>No sermons match “{query}”. Try another title or keyword.</div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sermon, index) => (
            <SermonCard key={sermon.id} sermon={sermon} priority={index === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
