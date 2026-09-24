"use client";

import Image from "next/image";
import type { PodcastEpisode } from "@/lib/podcast";
import Button from "@/components/ui/Button";

// Extracted from FeaturedSermon.tsx so the sermon detail page can offer the
// same audio pane when a confident video↔episode pairing exists
// (lib/sermonPairing.ts), not just the featured card.

export default function ListenPane({
  episode,
  artwork,
  playing,
  onToggle,
}: {
  episode: PodcastEpisode;
  artwork?: string;
  playing: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="grid gap-6 rounded-2xl border border-black/[0.07] bg-[#f5f7fa] p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:p-7">
      {artwork && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={playing ? "Pause the message" : "Play the message"}
          className="group relative mx-auto w-full max-w-[16rem] overflow-hidden rounded-2xl shadow-lg sm:mx-0 sm:max-w-none"
          style={{ aspectRatio: "1/1" }}
        >
          <Image
            src={artwork}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 640px) 16rem, 14rem"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-destiny-orange shadow-xl">
              <span
                className="material-symbols-rounded text-3xl"
                style={{
                  fontVariationSettings: '"FILL" 1',
                  paddingLeft: playing ? 0 : "3px",
                }}
              >
                {playing ? "pause" : "play_arrow"}
              </span>
            </span>
          </span>
        </button>
      )}

      <div className="min-w-0">
        {episode.summary && (
          <p className="line-clamp-4 text-sm leading-relaxed text-muted">
            {episode.summary}
          </p>
        )}
        <Button type="button" onClick={onToggle} size="lg" className="mt-5">
          <span
            className="material-symbols-rounded text-xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            {playing ? "pause" : "play_arrow"}
          </span>
          {playing ? "Playing" : "Listen now"}
        </Button>
      </div>
    </div>
  );
}
