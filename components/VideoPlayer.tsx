"use client";

import { useEffect, useMemo, useRef } from "react";
import { useContinueWatching } from "@/lib/continueWatching";

const FALLBACK_VIDEO =
  "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4";

type VideoPlayerProps = {
  sermonId: string;
  title: string;
  videoUrl?: string;
  poster?: string;
  durationSeconds?: number;
  youtubeVideoId?: string;
};

export default function VideoPlayer({
  sermonId,
  title,
  videoUrl,
  poster,
  durationSeconds,
  youtubeVideoId,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { items, saveProgress, clearProgress } = useContinueWatching();

  const resumeFrom = useMemo(() => {
    const match = items.find((item) => item.sermonId === sermonId);
    return match?.lastPosition ?? 0;
  }, [items, sermonId]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !resumeFrom) return;

    const handleLoaded = () => {
      if (resumeFrom < (videoEl.duration || Infinity)) {
        videoEl.currentTime = resumeFrom;
      }
    };

    videoEl.addEventListener("loadedmetadata", handleLoaded);
    return () => {
      videoEl.removeEventListener("loadedmetadata", handleLoaded);
    };
  }, [resumeFrom]);

  const persistProgress = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const currentTime = videoEl.currentTime;
    const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : undefined;
    saveProgress(sermonId, currentTime, duration ?? durationSeconds);
  };

  if (youtubeVideoId) {
    return (
      <div className="overflow-hidden rounded-xl border border-black/5 bg-black shadow-lg">
        <div className="relative aspect-video w-full">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="bg-white px-4 py-3 text-sm font-semibold text-destiny-black sm:px-5">
          {title}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/5 bg-black shadow-lg">
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full"
        controls
        onTimeUpdate={persistProgress}
        onPause={persistProgress}
        onSeeked={persistProgress}
        onEnded={() => clearProgress(sermonId)}
      >
        <source src={videoUrl ?? FALLBACK_VIDEO} type="video/mp4" />
        Sorry, your browser does not support embedded videos.
      </video>
      <div className="bg-white px-4 py-3 text-sm font-semibold text-destiny-black sm:px-5">
        {title}
      </div>
    </div>
  );
}
