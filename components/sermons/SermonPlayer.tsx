"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useCookieConsent } from "@/lib/cookieConsent";

/* global YT */
declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface SermonPlayerProps {
  videoId: string;
  thumbnail?: string;
  sermonStart?: number | null;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

let apiLoading = false;
const apiCallbacks: (() => void)[] = [];

function loadYTApi(cb: () => void) {
  if (window.YT?.Player) {
    cb();
    return;
  }
  apiCallbacks.push(cb);
  if (apiLoading) return;
  apiLoading = true;
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    prev?.();
    apiCallbacks.forEach((fn) => fn());
    apiCallbacks.length = 0;
  };
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

export default function SermonPlayer({ videoId, thumbnail, sermonStart }: SermonPlayerProps) {
  const { consent, allowAll, savePreferences } = useCookieConsent();
  const [mounted, setMounted] = useState(false);
  const [showJump, setShowJump] = useState(!!sermonStart);
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canPlay = mounted && consent?.media === true;

  const startPolling = useCallback(() => {
    if (!sermonStart) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      if (player.getCurrentTime() >= sermonStart) {
        setShowJump(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 1000);
  }, [sermonStart]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Initialise YT player once canPlay is true
  useEffect(() => {
    if (!canPlay || !containerRef.current) return;

    loadYTApi(() => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      playerRef.current = new window.YT!.Player(containerRef.current! as unknown as string, {
        videoId,
        playerVars: {
          modestbranding: 1 as YT.ModestBranding,
          rel: 0 as YT.RelatedVideos,
          autoplay: 0 as YT.AutoPlay,
        },
        events: {
          onStateChange: () => startPolling(),
        },
      });
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPlay, videoId]);

  const handleJump = () => {
    if (!sermonStart || !playerRef.current?.seekTo) return;
    playerRef.current.seekTo(sermonStart, true);
    playerRef.current.playVideo();
    startPolling();
  };

  if (!mounted || !canPlay) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#111]">
        {thumbnail && (
          <Image
            src={thumbnail}
            alt=""
            fill
            className="object-cover opacity-30 blur-sm scale-105"
            sizes="(max-width: 1024px) 100vw, 740px"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-6 text-center">
          <span className="material-symbols-rounded text-5xl text-white/40">
            cookie
          </span>
          <div>
            <p className="text-base font-black text-white">
              Cookies required to play video
            </p>
            <p className="mt-1 max-w-xs text-sm text-white/50">
              YouTube uses cookies to serve this video. Accept them to watch.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={allowAll}
              className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/20 transition hover:brightness-110"
            >
              Accept all cookies
            </button>
            <button
              onClick={() => savePreferences({ media: true, analytics: false })}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Allow media only
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <div ref={containerRef} className="h-full w-full" />

      {sermonStart && showJump && (
        <button
          onClick={handleJump}
          className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/40 transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-lg">fast_forward</span>
          Jump to Sermon ({formatTimestamp(sermonStart)})
        </button>
      )}
    </div>
  );
}
