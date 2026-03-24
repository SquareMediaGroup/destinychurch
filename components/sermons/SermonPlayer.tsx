"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useCookieConsent } from "@/lib/cookieConsent";

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
  if (window.YT?.Player) { cb(); return; }
  apiCallbacks.push(cb);
  if (apiLoading) return;
  apiLoading = true;
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => { prev?.(); apiCallbacks.forEach((fn) => fn()); apiCallbacks.length = 0; };
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

export default function SermonPlayer({ videoId, thumbnail, sermonStart }: SermonPlayerProps) {
  const { consent, allowAll, savePreferences } = useCookieConsent();
  const [mounted, setMounted] = useState(false);
  const [showJump, setShowJump] = useState(!!sermonStart);
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useIsMobile();

  // Custom controls state (docked desktop)
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const controlsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drag (desktop PiP)
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setDocked(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [mounted]);

  useEffect(() => { if (!docked) setDismissed(false); }, [docked]);

  // Poll player state for custom controls
  useEffect(() => {
    if (controlsPollRef.current) clearInterval(controlsPollRef.current);
    if (!docked || dismissed || isMobile) return;
    controlsPollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getPlayerState || !p?.getCurrentTime || !p?.getDuration) return;
      const state = p.getPlayerState();
      setPlaying(state === 1); // YT.PlayerState.PLAYING
      const dur = p.getDuration();
      const cur = p.getCurrentTime();
      setDuration(dur);
      setCurrentTime(cur);
      setProgress(dur > 0 ? cur / dur : 0);
    }, 250);
    return () => { if (controlsPollRef.current) clearInterval(controlsPollRef.current); };
  }, [docked, dismissed, isMobile]);

  const canPlay = mounted && consent?.media === true;

  const startPolling = useCallback(() => {
    if (!sermonStart) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      if (p.getCurrentTime() >= sermonStart) {
        setShowJump(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 1000);
  }, [sermonStart]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => {
    if (!canPlay || !containerRef.current) return;
    loadYTApi(() => {
      if (playerRef.current) playerRef.current.destroy();
      playerRef.current = new window.YT!.Player(containerRef.current! as unknown as string, {
        videoId,
        playerVars: { modestbranding: 1 as YT.ModestBranding, rel: 0 as YT.RelatedVideos, autoplay: 0 as YT.AutoPlay },
        events: { onStateChange: () => startPolling() },
      });
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); playerRef.current?.destroy(); playerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPlay, videoId]);

  const handleJump = () => {
    if (!sermonStart || !playerRef.current?.seekTo) return;
    playerRef.current.seekTo(sermonStart, true);
    playerRef.current.playVideo();
    startPolling();
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo(); else p.playVideo();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = playerRef.current;
    if (!p?.seekTo || !p?.getDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    p.seekTo(frac * p.getDuration(), true);
  };

  // Drag handlers — on the overlay div, not the iframe
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || (e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - 380, dragStart.current.px + (dragStart.current.mx - e.clientX))),
      y: Math.max(8, Math.min(window.innerHeight - 230, dragStart.current.py + (dragStart.current.my - e.clientY))),
    });
  };
  const onPointerUp = () => { dragging.current = false; };

  // Cookie consent — no dock
  if (!mounted || !canPlay) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#111]">
        {thumbnail && (
          <Image src={thumbnail} alt="" fill className="object-cover opacity-30 blur-sm scale-105" sizes="(max-width: 1024px) 100vw, 740px" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-6 text-center">
          <span className="material-symbols-rounded text-5xl text-white/40">cookie</span>
          <div>
            <p className="text-base font-black text-white">Cookies required to play video</p>
            <p className="mt-1 max-w-xs text-sm text-white/50">YouTube uses cookies to serve this video. Accept them to watch.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={allowAll} className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/20 transition hover:brightness-110">
              Accept all cookies
            </button>
            <button onClick={() => savePreferences({ media: true, analytics: false })} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white">
              Allow media only
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showDocked = docked && !dismissed;
  const showDesktopDock = showDocked && !isMobile;

  const wrapperClass = showDocked
    ? isMobile
      ? "sticky top-0 z-40 w-full bg-black shadow-lg shadow-black/40"
      : "fixed z-50 overflow-hidden rounded-xl shadow-2xl shadow-black/60"
    : "relative w-full overflow-hidden rounded-2xl";

  const wrapperStyle: React.CSSProperties = showDesktopDock
    ? { right: pos.x, bottom: pos.y, width: 360 }
    : {};

  return (
    <div ref={sentinelRef} style={{ aspectRatio: "16/9" }}>
      <div
        ref={wrapperRef}
        className={wrapperClass}
        style={wrapperStyle}
      >
        <div className="relative aspect-video w-full bg-black">
          <div ref={containerRef} className="h-full w-full" />

          {/* Desktop docked: overlay that blocks iframe and enables dragging + custom controls */}
          {showDesktopDock && (
            <div
              className="absolute inset-0 z-10 flex cursor-grab flex-col justify-between active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* Top bar: drag handle + close */}
              <div className="flex items-center justify-between px-3 pt-2">
                <div className="h-1 w-8 rounded-full bg-white/20" />
                <button
                  onClick={() => setDismissed(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/60 transition hover:bg-black/80 hover:text-white"
                  aria-label="Close mini player"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Center: play/pause */}
              <div className="flex items-center justify-center">
                <button
                  onClick={togglePlay}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 hover:scale-110"
                >
                  {playing ? (
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Bottom bar: progress + time */}
              <div className="px-3 pb-2">
                <div className="mb-1 flex items-center justify-between text-[10px] text-white/50">
                  <span>{formatTimestamp(Math.floor(currentTime))}</span>
                  <span>{formatTimestamp(Math.floor(duration))}</span>
                </div>
                {/* Progress bar */}
                <div
                  className="group relative h-1.5 cursor-pointer rounded-full bg-white/20"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full rounded-full bg-destiny-orange transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition group-hover:opacity-100"
                    style={{ left: `${progress * 100}%`, marginLeft: -6 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Scroll back — mobile docked only */}
          {showDocked && isMobile && (
            <button
              onClick={() => sentinelRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/60 transition hover:text-white"
              aria-label="Scroll to player"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}

          {/* Jump to sermon — inline & mobile docked */}
          {sermonStart && showJump && !showDesktopDock && (
            <button
              onClick={handleJump}
              className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/40 transition hover:brightness-110"
            >
              <span className="material-symbols-rounded text-lg">fast_forward</span>
              Skip to Sermon ({formatTimestamp(sermonStart)})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
