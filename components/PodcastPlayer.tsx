"use client";

import { useRef } from "react";
import { useContinueWatching } from "@/lib/continueWatching";

type PodcastPlayerProps = {
  sermonId: string;
  title: string;
  audioUrl: string;
  durationSeconds?: number;
};

export default function PodcastPlayer({
  sermonId,
  title,
  audioUrl,
  durationSeconds,
}: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { saveProgress, clearProgress } = useContinueWatching();

  const persistProgress = () => {
    const el = audioRef.current;
    if (!el) return;
    const current = el.currentTime;
    const duration = Number.isFinite(el.duration) ? el.duration : durationSeconds;
    saveProgress(sermonId, current, duration);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-destiny-black">Podcast audio</p>
        <span className="text-xs font-medium uppercase tracking-wide text-destiny-orange">
          Listen only
        </span>
      </div>
      <div className="px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-destiny-black">{title}</p>
        <audio
          ref={audioRef}
          controls
          className="mt-3 w-full"
          onTimeUpdate={persistProgress}
          onPause={persistProgress}
          onSeeked={persistProgress}
          onEnded={() => clearProgress(sermonId)}
        >
          <source src={audioUrl} />
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
}
