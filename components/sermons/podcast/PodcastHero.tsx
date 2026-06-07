"use client";

import Image from "next/image";
import Link from "next/link";
import type { PodcastEpisode } from "@/lib/podcast";
import { formatEpisodeDate, formatEpisodeDuration } from "@/lib/podcast";
import { usePodcastPlayer } from "./PodcastPlayerProvider";

export default function PodcastHero({
  episode,
  watchHref,
}: {
  episode: PodcastEpisode;
  /** Where "Watch instead" goes — the latest YouTube sermon detail page. */
  watchHref: string | null;
}) {
  const { toggle, isActive, isPlaying } = usePodcastPlayer();
  const active = isActive(episode.id);
  const playing = active && isPlaying;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      {/* Left — copy + controls */}
      <div className="order-2 lg:order-1">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-destiny-orange">
          Latest Episode
        </p>
        <h2
          className="mt-4 text-3xl font-black leading-[1.05] text-white sm:text-4xl lg:text-[2.75rem]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {episode.title}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/55">
          {episode.speaker && (
            <span className="font-semibold text-white/75">
              {episode.speaker}
            </span>
          )}
          {episode.speaker && <span className="text-white/25">·</span>}
          <span>{formatEpisodeDate(episode.publishedAt)}</span>
          {episode.durationSeconds > 0 && (
            <>
              <span className="text-white/25">·</span>
              <span>{formatEpisodeDuration(episode.durationSeconds)}</span>
            </>
          )}
        </div>

        {episode.summary && (
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/60 line-clamp-3">
            {episode.summary}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => toggle(episode)}
            className="inline-flex items-center gap-2.5 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110"
          >
            <span
              className="material-symbols-rounded text-xl"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              {playing ? "pause" : "play_arrow"}
            </span>
            {playing ? "Playing" : "Listen now"}
          </button>

          {watchHref && (
            <Link
              href={watchHref}
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/5"
            >
              <span className="material-symbols-rounded text-xl">play_circle</span>
              Watch on video
            </Link>
          )}
        </div>
      </div>

      {/* Right — artwork */}
      <div className="order-1 lg:order-2">
        <button
          onClick={() => toggle(episode)}
          className="group relative block w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50"
          style={{ aspectRatio: "1/1" }}
          aria-label={playing ? "Pause latest episode" : "Play latest episode"}
        >
          <Image
            src={episode.image}
            alt={episode.title}
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover transition duration-500 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-destiny-orange shadow-2xl transition duration-300 group-hover:scale-110">
              <span
                className="material-symbols-rounded text-4xl"
                style={{ fontVariationSettings: '"FILL" 1', paddingLeft: playing ? 0 : "3px" }}
              >
                {playing ? "pause" : "play_arrow"}
              </span>
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
