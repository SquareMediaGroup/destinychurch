"use client";

import { useEffect, useMemo, useRef } from "react";
import Icon from "./Icon";
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

const formatTime = (value?: number) => {
  if (!value || Number.isNaN(value)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const clampPercent = (value: number) => Math.min(Math.max(value, 0), 100);

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

  const resumeDetails = useMemo(
    () => items.find((item) => item.sermonId === sermonId),
    [items, sermonId],
  );
  const resumeFrom = resumeDetails?.lastPosition ?? 0;
  const resumeDuration = resumeDetails?.durationSeconds ?? durationSeconds;
  const resumePercent =
    resumeDuration && resumeDuration > 0
      ? clampPercent((resumeFrom / resumeDuration) * 100)
      : null;
  const durationLabel = durationSeconds ? formatTime(durationSeconds) : null;

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
    saveProgress(sermonId, currentTime, duration ?? durationSeconds ?? resumeDuration);
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
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_16px_60px_rgba(0,0,0,0.12)]">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0${autoplayQuery}${playlistQuery}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <VideoFooter
        title={title}
        youtubeVideoId={youtubeVideoId}
        durationLabel={durationLabel}
          resumeFrom={resumeFrom}
          resumePercent={resumePercent}
        />
      </div>
    );
  }

  if (!decided || !mediaAllowed) {
    return <BlockedVideo title={title} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_16px_60px_rgba(0,0,0,0.12)]">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          poster={poster}
          className="absolute inset-0 h-full w-full object-cover"
          controls
          autoPlay={autoPlay}
          playsInline
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
        <VideoOverlays
          durationLabel={durationLabel}
          resumeFrom={resumeFrom}
          resumePercent={resumePercent}
        />
      </div>
      <VideoFooter
        title={title}
        durationLabel={durationLabel}
        resumeFrom={resumeFrom}
        resumePercent={resumePercent}
      />
    </div>
  );
}

function BlockedVideo({ title }: { title: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-[var(--surface-muted)] shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
      <div className="flex aspect-video w-full items-center justify-center px-6 text-center sm:px-10">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-destiny-black">Video blocked until you enable media cookies.</p>
          <p className="text-sm text-destiny-grey">
            We use YouTube and Cloudflare embeds to stream sermons. Update your cookie preferences to allow video.
          </p>
          <a
            href="/cookies"
            className="inline-flex w-full items-center justify-center rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95 sm:w-auto"
          >
            Manage cookies
          </a>
        </div>
      </div>
      <div className="bg-white px-4 py-3 text-sm font-semibold text-destiny-black sm:px-5">{title}</div>
    </div>
  );
}

type VideoMetaProps = {
  title: string;
  durationLabel?: string | null;
  resumeFrom?: number;
  resumePercent?: number | null;
  youtubeVideoId?: string;
};

function VideoFooter({
  title,
  durationLabel,
  resumeFrom,
  resumePercent,
  youtubeVideoId,
}: VideoMetaProps) {
  return (
    <div className="space-y-3 bg-white px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-lg font-semibold leading-tight text-destiny-black">
            {title}
          </p>
          <p className="text-sm text-destiny-grey">
            {durationLabel ? `${durationLabel} • Saves your spot on this device` : "Saves your spot on this device"}
          </p>
        </div>
        {youtubeVideoId ? (
          <a
            href={`https://youtu.be/${youtubeVideoId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-destiny-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
          >
            <Icon name="open_in_new" size={18} />
            <span className="ml-1.5">Open in YouTube</span>
          </a>
        ) : (
          <span className="inline-flex items-center justify-center rounded-full bg-destiny-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-destiny-blue">
            Inline playback
          </span>
        )}
      </div>

      {resumePercent !== null && resumeFrom ? (
        <div className="flex items-center gap-2 rounded-xl bg-destiny-orange/5 px-3 py-2 text-xs font-semibold text-destiny-orange">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destiny-orange text-white">
            <Icon name="replay" size={16} />
          </span>
          <span>
            Resume from {formatTime(resumeFrom)} ({Math.round(resumePercent)}%)
          </span>
        </div>
      ) : (
        <div className="rounded-xl bg-destiny-blue/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-destiny-blue">
          Tip: rotate your phone for a larger view.
        </div>
      )}
    </div>
  );
}

type VideoOverlayProps = {
  durationLabel?: string | null;
  resumeFrom?: number;
  resumePercent?: number | null;
};

function VideoOverlays({
  durationLabel,
  resumeFrom,
  resumePercent,
}: VideoOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
      <div className="absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
          <Icon name="play_circle" size={16} className="mr-1.5" />
          Tap to play
        </span>
        {durationLabel ? (
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
            <Icon name="schedule" size={16} className="mr-1.5" />
            {durationLabel}
          </span>
        ) : null}
      </div>
      {resumePercent !== null && resumeFrom ? (
        <div className="absolute inset-x-3 bottom-3 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
            <span className="inline-flex items-center rounded-full bg-black/50 px-2.5 py-1 backdrop-blur">
              Resume {formatTime(resumeFrom)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/30 backdrop-blur">
            <div
              className="h-full rounded-full bg-destiny-orange shadow-[0_6px_30px_rgba(245,128,33,0.45)]"
              style={{ width: `${resumePercent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="absolute left-3 bottom-3 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
          Saves your place as you watch
        </div>
      )}
    </div>
  );
}
