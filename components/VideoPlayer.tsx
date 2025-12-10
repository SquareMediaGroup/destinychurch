"use client";

import { useEffect, useMemo, useRef } from "react";
import { useContinueWatching } from "@/lib/continueWatching";
import { useCookieConsent } from "@/lib/cookieConsent";

const FALLBACK_VIDEO =
  "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4";

type VideoPlayerProps = {
  sermonId: string;
  title: string;
  videoUrl?: string;
  poster?: string;
  durationSeconds?: number;
  youtubeVideoId?: string;
  autoPlay?: boolean;
  playlistIds?: string[];
  onEnded?: () => void;
};

export default function VideoPlayer({
  sermonId,
  title,
  videoUrl,
  poster,
  durationSeconds,
  youtubeVideoId,
  autoPlay,
  playlistIds,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { items, saveProgress, clearProgress } = useContinueWatching();
  const { consent, decided } = useCookieConsent();

  const mediaAllowed = consent?.media === true;

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
    if (!mediaAllowed) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const currentTime = videoEl.currentTime;
    const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : undefined;
    saveProgress(sermonId, currentTime, duration ?? durationSeconds);
  };

  if (youtubeVideoId) {
    if (!decided || !mediaAllowed) {
      return (
        <BlockedVideo title={title} />
      );
    }

    const queue = (playlistIds || []).filter(Boolean);
    const playlistQuery = queue.length ? `&playlist=${queue.join(",")}` : "";
    const autoplayQuery = autoPlay ? "&autoplay=1" : "";
    return (
      <div className="overflow-hidden rounded-xl border border-black/5 bg-black shadow-lg">
        <div className="relative aspect-video w-full">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0${autoplayQuery}${playlistQuery}`}
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

  if (!decided || !mediaAllowed) {
    return <BlockedVideo title={title} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/5 bg-black shadow-lg">
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full"
        controls
        autoPlay={autoPlay}
        onTimeUpdate={persistProgress}
        onPause={persistProgress}
        onSeeked={persistProgress}
        onEnded={() => {
          clearProgress(sermonId);
          onEnded?.();
        }}
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

function BlockedVideo({ title }: { title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/5 bg-[var(--surface-muted)] shadow-lg">
      <div className="flex aspect-video w-full items-center justify-center px-6 text-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-destiny-black">Video blocked until you enable media cookies.</p>
          <p className="text-sm text-destiny-grey">
            We use YouTube and Cloudflare embeds to stream sermons. Update your cookie preferences to allow video.
          </p>
          <a
            href="/cookies"
            className="inline-flex items-center justify-center rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95"
          >
            Manage cookies
          </a>
        </div>
      </div>
      <div className="bg-white px-4 py-3 text-sm font-semibold text-destiny-black sm:px-5">{title}</div>
    </div>
  );
}
