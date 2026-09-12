"use client";

import Link from "next/link";
import Image from "next/image";
import type { YTVideo } from "@/lib/youtube";
import { formatDate, formatDuration } from "@/lib/youtube";
import type { PodcastEpisode } from "@/lib/podcast";
import { usePodcastPlayer } from "./podcast/PodcastPlayerProvider";

export default function SermonCard({
  video,
  episode,
  isGuest,
}: {
  video: YTVideo;
  /** A confidently-paired podcast episode, when one exists — shows a Listen button. */
  episode?: PodcastEpisode;
  isGuest?: boolean;
}) {
  const duration = formatDuration(video.duration);
  const date = formatDate(video.publishedAt);
  const { toggle, isActive, isPlaying } = usePodcastPlayer();
  const playing = episode ? isActive(episode.id) && isPlaying : false;

  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(16,24,40,.05),0_16px_36px_-12px_rgba(16,24,40,.16)]">
      <Link href={`/sermons/${video.id}`} className="block">
        <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
          <Image
            src={video.thumbnail}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/0 text-white opacity-0 shadow-xl transition group-hover:bg-white group-hover:text-destiny-orange group-hover:opacity-100">
              <span
                className="material-symbols-rounded text-2xl"
                style={{ fontVariationSettings: '"FILL" 1', paddingLeft: "2px" }}
              >
                play_arrow
              </span>
            </span>
          </span>
          {duration && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-white">
              {duration}
            </span>
          )}
        </div>

        <div className="p-4">
          {(video.speaker || isGuest) && (
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-destiny-orange">
              {video.speaker}
              {isGuest && (
                <span className="rounded-full bg-destiny-orange/10 px-1.5 py-0.5 text-[10px] tracking-wide text-destiny-orange">
                  Guest
                </span>
              )}
            </p>
          )}
          <p className="line-clamp-2 text-[15px] font-bold leading-snug text-destiny-grey">
            {video.title}
          </p>
          {date && <p className="mt-1.5 text-xs text-destiny-grey/55">{date}</p>}
        </div>
      </Link>

      {episode && (
        <button
          type="button"
          onClick={() => toggle(episode)}
          aria-label={playing ? "Pause audio" : "Listen to audio"}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-destiny-orange"
        >
          <span
            className="material-symbols-rounded text-lg"
            style={{ fontVariationSettings: playing ? '"FILL" 1' : undefined }}
          >
            {playing ? "pause" : "headphones"}
          </span>
        </button>
      )}
    </div>
  );
}
