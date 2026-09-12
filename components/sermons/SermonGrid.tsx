"use client";

import { useMemo, useState } from "react";
import type { YTVideo } from "@/lib/youtube";
import { normalizeSpeakerName } from "@/lib/sermonTitle";
import { searchSermons } from "@/lib/sermonSearch";
import SermonCard from "./SermonCard";

const PAGE_SIZE = 24;

/** One speaker filter option — label is whichever raw spelling appeared first. */
interface SpeakerOption {
  key: string;
  label: string;
}

function speakerOptions(videos: YTVideo[]): SpeakerOption[] {
  const seen = new Map<string, string>();
  for (const v of videos) {
    const key = normalizeSpeakerName(v.speaker);
    if (key && !seen.has(key)) seen.set(key, v.speaker!);
  }
  return [...seen.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

interface MonthOption {
  key: string; // "2026-09"
  label: string; // "September 2026"
}

function monthOptions(videos: YTVideo[]): MonthOption[] {
  const seen = new Map<string, string>();
  for (const v of videos) {
    const d = new Date(v.publishedAt);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!seen.has(key)) {
      seen.set(key, d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }));
    }
  }
  return [...seen.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => (a.key < b.key ? 1 : -1)); // newest month first
}

function monthKey(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SermonGrid({ videos }: { videos: YTVideo[] }) {
  const [query, setQuery] = useState("");
  const [selectedSpeakers, setSelectedSpeakers] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const speakers = useMemo(() => speakerOptions(videos), [videos]);
  const months = useMemo(() => monthOptions(videos), [videos]);

  const filtered = useMemo(() => {
    let pool = videos;
    if (selectedSpeakers.size > 0) {
      pool = pool.filter((v) => {
        const key = normalizeSpeakerName(v.speaker);
        return key !== null && selectedSpeakers.has(key);
      });
    }
    if (selectedMonth) {
      pool = pool.filter((v) => monthKey(v.publishedAt) === selectedMonth);
    }

    const q = query.trim();
    const searched = q ? searchSermons(pool, q, undefined, pool.length) : pool;

    // searchSermons already ranks by relevance when there's a query — only
    // apply the explicit date sort when there's nothing to rank by.
    if (q) return searched;
    return [...searched].sort((a, b) =>
      sort === "newest"
        ? b.publishedAt.localeCompare(a.publishedAt)
        : a.publishedAt.localeCompare(b.publishedAt)
    );
  }, [videos, query, selectedSpeakers, selectedMonth, sort]);

  const visible = filtered.slice(0, visibleCount);
  const activeFilterCount = selectedSpeakers.size + (selectedMonth ? 1 : 0);

  function toggleSpeaker(key: string) {
    setVisibleCount(PAGE_SIZE);
    setSelectedSpeakers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectMonth(key: string | null) {
    setVisibleCount(PAGE_SIZE);
    setSelectedMonth(key);
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
            {filtered.length} message{filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          {/* Search */}
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <span className="material-symbols-rounded pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-destiny-grey/40">
              search
            </span>
            <input
              value={query}
              onChange={(e) => {
                setVisibleCount(PAGE_SIZE);
                setQuery(e.target.value);
              }}
              placeholder="Search sermons — try a topic or a speaker's name…"
              aria-label="Search sermons"
              className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-11 pr-4 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>

          {/* Filters toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
          >
            <span className="material-symbols-rounded text-lg">tune</span>
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destiny-orange px-1 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="mt-4 rounded-2xl border border-black/[0.07] bg-white p-5">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-destiny-grey/50">
                  Speaker
                </p>
                <div className="flex overflow-hidden rounded-full border border-black/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSort("newest")}
                    className={`px-3 py-1 transition ${sort === "newest" ? "bg-destiny-grey text-white" : "text-destiny-grey/60"}`}
                  >
                    Newest
                  </button>
                  <button
                    type="button"
                    onClick={() => setSort("oldest")}
                    className={`px-3 py-1 transition ${sort === "oldest" ? "bg-destiny-grey text-white" : "text-destiny-grey/60"}`}
                  >
                    Oldest
                  </button>
                </div>
              </div>
              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                {speakers.length === 0 && (
                  <p className="text-sm text-destiny-grey/40">No speakers found yet.</p>
                )}
                {speakers.map((s) => {
                  const active = selectedSpeakers.has(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSpeaker(s.key)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        active
                          ? "border-destiny-orange bg-destiny-orange text-white"
                          : "border-black/10 text-destiny-grey/70 hover:border-destiny-orange hover:text-destiny-orange"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-destiny-grey/50">
                Month
              </p>
              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => selectMonth(null)}
                  aria-pressed={selectedMonth === null}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    selectedMonth === null
                      ? "border-destiny-orange bg-destiny-orange text-white"
                      : "border-black/10 text-destiny-grey/70 hover:border-destiny-orange hover:text-destiny-orange"
                  }`}
                >
                  All time
                </button>
                {months.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => selectMonth(m.key)}
                    aria-pressed={selectedMonth === m.key}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      selectedMonth === m.key
                        ? "border-destiny-orange bg-destiny-orange text-white"
                        : "border-black/10 text-destiny-grey/70 hover:border-destiny-orange hover:text-destiny-orange"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedSpeakers(new Set());
                setSelectedMonth(null);
                setVisibleCount(PAGE_SIZE);
              }}
              className="mt-4 text-xs font-bold text-destiny-orange hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {visible.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((video) => (
            <SermonCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl border border-black/[0.07] bg-[#f5f7fa] p-8 text-center text-sm text-destiny-grey/60">
          No sermons match your search or filters.
        </p>
      )}

      {/* Reveal more — everything's already in memory, no network call */}
      {visibleCount < filtered.length && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-destiny-grey/15 px-7 py-3 text-sm font-bold text-destiny-grey transition hover:border-destiny-grey/40 hover:bg-black/[0.03]"
          >
            Show more
            <span className="material-symbols-rounded text-lg">expand_more</span>
          </button>
        </div>
      )}
    </div>
  );
}
