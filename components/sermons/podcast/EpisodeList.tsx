"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { PodcastEpisode } from "@/lib/podcast";
import { formatEpisodeDate, formatEpisodeDuration } from "@/lib/podcast";
import { usePodcastPlayer } from "./PodcastPlayerProvider";

const PAGE = 12;

export default function EpisodeList({
  episodes,
}: {
  episodes: PodcastEpisode[];
}) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return episodes;
    return episodes.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.speaker ?? "").toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q)
    );
  }, [episodes, query]);

  const shown = filtered.slice(0, visible);

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-destiny-grey md:text-4xl">
            All episodes
          </h2>
          <p className="mt-2 text-sm text-destiny-grey/55">
            {episodes.length} messages and counting
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-rounded pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-destiny-grey/40">
            search
          </span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE);
            }}
            placeholder="Search episodes…"
            aria-label="Search episodes"
            className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-11 pr-4 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
          />
        </div>
      </div>

      {/* List */}
      <ul className="mt-6 divide-y divide-black/[0.06] overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)]">
        {shown.map((ep, i) => (
          <EpisodeRow key={ep.id} ep={ep} index={i} />
        ))}
        {shown.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-destiny-grey/50">
            No episodes match “{query}”.
          </li>
        )}
      </ul>

      {visible < filtered.length && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-destiny-grey/15 px-7 py-3 text-sm font-bold text-destiny-grey transition hover:border-destiny-grey/40 hover:bg-black/[0.03]"
          >
            Load more
            <span className="material-symbols-rounded text-lg">expand_more</span>
          </button>
        </div>
      )}
    </div>
  );
}

function EpisodeRow({ ep, index }: { ep: PodcastEpisode; index: number }) {
  const { toggle, isActive, isPlaying } = usePodcastPlayer();
  const active = isActive(ep.id);
  const playing = active && isPlaying;

  return (
    <li
      className={`group flex items-center gap-4 px-3 py-3 transition sm:px-4 ${
        active ? "bg-destiny-orange/[0.06]" : "hover:bg-black/[0.02]"
      }`}
    >
      {/* Artwork + play */}
      <button
        onClick={() => toggle(ep)}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"
        aria-label={playing ? `Pause ${ep.title}` : `Play ${ep.title}`}
      >
        <Image
          src={ep.image}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
        />
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/45 transition ${
            playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <span
            className="material-symbols-rounded text-3xl text-white"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            {playing ? "pause" : "play_arrow"}
          </span>
        </span>
      </button>

      {/* Text */}
      <button
        onClick={() => toggle(ep)}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={`truncate text-[15px] font-bold leading-snug ${
            active ? "text-destiny-orange" : "text-destiny-grey"
          }`}
        >
          {ep.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-destiny-grey/55">
          {ep.speaker ? `${ep.speaker} · ` : ""}
          {formatEpisodeDate(ep.publishedAt)}
        </p>
      </button>

      {/* Duration */}
      <span className="hidden shrink-0 font-mono text-xs tabular-nums text-destiny-grey/45 sm:block">
        {formatEpisodeDuration(ep.durationSeconds)}
      </span>

      <span className="sr-only">Episode {index + 1}</span>
    </li>
  );
}
