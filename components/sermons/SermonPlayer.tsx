/// <reference types="youtube" />
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useCookieConsent } from "@/lib/cookieConsent";
import { useSermonPlayerState } from "@/lib/sermonPlayerContext";

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

// ── Icons ──────────────────────────────────────────────────────────────────

function IconPlay() {
  return (
    <svg className="h-full w-full pl-[0.1em]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg className="h-full w-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

function IconVolume() {
  return (
    <svg className="h-full w-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function IconMute() {
  return (
    <svg className="h-full w-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  );
}

function IconFullscreen() {
  return (
    <svg className="h-full w-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );
}

function IconExitFullscreen() {
  return (
    <svg className="h-full w-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  );
}

function IconSkip() {
  return (
    <svg className="h-full w-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconScrollUp() {
  return (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────

function ProgressBar({ progress, onSeek, thin }: { progress: number; onSeek: (e: React.MouseEvent<HTMLDivElement>) => void; thin?: boolean }) {
  return (
    <div
      className={`group/bar relative cursor-pointer rounded-full bg-white/25 transition-all hover:h-2 ${thin ? "h-1" : "h-1.5"}`}
      onClick={onSeek}
    >
      <div className="h-full rounded-full bg-destiny-orange" style={{ width: `${progress * 100}%` }} />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition group-hover/bar:opacity-100"
        style={{ left: `calc(${progress * 100}% - 6px)` }}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SermonPlayer({ videoId, thumbnail, sermonStart }: SermonPlayerProps) {
  const { consent, allowAll, savePreferences } = useCookieConsent();
  const [mounted, setMounted] = useState(false);
  const [showJump, setShowJump] = useState(!!sermonStart);

  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const jumpPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [docked, setDocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useIsMobile();

  const { setPlaying: setGlobalPlaying } = useSermonPlayerState();
  const [playing, setPlayingLocal] = useState(false);
  const setPlaying = useCallback((v: boolean) => { setPlayingLocal(v); setGlobalPlaying(v); }, [setGlobalPlaying]);

  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Desktop PiP drag state
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => { setMounted(true); }, []);

  // Sentinel intersection → docked state
  useEffect(() => {
    if (!mounted) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setDocked(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [mounted]);

  useEffect(() => { if (!docked) setDismissed(false); }, [docked]);

  // Fullscreen detection
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const canPlay = mounted && consent?.media === true;

  // Poll player state continuously
  useEffect(() => {
    if (statePollRef.current) clearInterval(statePollRef.current);
    if (!canPlay) return;
    statePollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getPlayerState) return;
      setPlaying(p.getPlayerState() === 1);
      if (p.getCurrentTime && p.getDuration) {
        const dur = p.getDuration();
        const cur = p.getCurrentTime();
        setDuration(dur);
        setCurrentTime(cur);
        setProgress(dur > 0 ? cur / dur : 0);
      }
      if (p.isMuted) setMuted(p.isMuted());
    }, 250);
    return () => { if (statePollRef.current) clearInterval(statePollRef.current); };
  }, [canPlay, setPlaying]);

  // Poll for sermonStart skip banner
  const startJumpPolling = useCallback(() => {
    if (!sermonStart) return;
    if (jumpPollRef.current) clearInterval(jumpPollRef.current);
    jumpPollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      if (p.getCurrentTime() >= sermonStart) {
        setShowJump(false);
        if (jumpPollRef.current) clearInterval(jumpPollRef.current);
      }
    }, 1000);
  }, [sermonStart]);

  useEffect(() => () => { if (jumpPollRef.current) clearInterval(jumpPollRef.current); }, []);

  // Mount YT player
  useEffect(() => {
    if (!canPlay || !containerRef.current) return;
    loadYTApi(() => {
      if (playerRef.current) playerRef.current.destroy();
      playerRef.current = new window.YT!.Player(containerRef.current! as unknown as string, {
        videoId,
        playerVars: {
          modestbranding: 1,
          rel: 0,
          autoplay: 0,
          controls: 0,       // hide YouTube's native controls
          disablekb: 1,      // we handle keyboard ourselves if needed
          iv_load_policy: 3, // no annotations
          fs: 0,             // we handle fullscreen ourselves
        },
        events: { onStateChange: () => startJumpPolling() },
      });
    });
    return () => {
      if (jumpPollRef.current) clearInterval(jumpPollRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPlay, videoId]);

  // Control handlers
  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo(); else p.playVideo();
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = playerRef.current;
    if (!p?.seekTo || !p?.getDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    p.seekTo(frac * p.getDuration(), true);
  };

  const handleJump = () => {
    if (!sermonStart || !playerRef.current?.seekTo) return;
    playerRef.current.seekTo(sermonStart, true);
    playerRef.current.playVideo();
    startJumpPolling();
  };

  const handleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };

  // Drag handlers (desktop PiP only)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
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

  // ── Cookie gate ────────────────────────────────────────────────────────────

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
  const isDesktopDock = showDocked && !isMobile;
  const isMobileDock = showDocked && isMobile;

  const wrapperClass = showDocked
    ? isMobile
      ? "sticky top-0 z-40 w-full bg-black shadow-lg shadow-black/40"
      : "fixed z-50 overflow-hidden rounded-xl shadow-2xl shadow-black/60"
    : "relative w-full overflow-hidden rounded-2xl";

  const wrapperStyle: React.CSSProperties = isDesktopDock ? { right: pos.x, bottom: pos.y, width: 360 } : {};

  return (
    <div ref={sentinelRef} style={{ aspectRatio: "16/9" }}>
      <div ref={wrapperRef} className={wrapperClass} style={wrapperStyle}>
        <div className="relative aspect-video w-full bg-black">

          {/* YouTube iframe target */}
          <div ref={containerRef} className="h-full w-full" />

          {/* ── Desktop PiP overlay (draggable, compact) ────────────────── */}
          {isDesktopDock && (
            <div
              className="absolute inset-0 z-10 flex cursor-grab flex-col justify-between active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-3 pt-2">
                <div className="h-1 w-8 rounded-full bg-white/20" />
                <button
                  onClick={() => setDismissed(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/60 transition hover:bg-black/80 hover:text-white"
                  aria-label="Close mini player"
                >
                  <span className="h-3 w-3"><IconClose /></span>
                </button>
              </div>

              {/* Center play/pause */}
              <div className="flex items-center justify-center">
                <button
                  onClick={togglePlay}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 hover:scale-110"
                >
                  <span className="h-6 w-6">{playing ? <IconPause /> : <IconPlay />}</span>
                </button>
              </div>

              {/* Bottom bar */}
              <div className="px-3 pb-2">
                <div className="mb-1 flex items-center justify-between text-[10px] text-white/50">
                  <span>{formatTimestamp(Math.floor(currentTime))}</span>
                  <span>{formatTimestamp(Math.floor(duration))}</span>
                </div>
                <ProgressBar progress={progress} onSeek={handleSeek} thin />
              </div>
            </div>
          )}

          {/* ── Mobile dock overlay (scroll-back button) ─────────────────── */}
          {isMobileDock && (
            <div className="absolute inset-0 z-10">
              <button
                onClick={() => sentinelRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/60 transition hover:text-white"
                aria-label="Scroll to player"
              >
                <span className="h-3.5 w-3.5"><IconScrollUp /></span>
              </button>
            </div>
          )}

          {/* ── Inline custom controls (always shown, not docked) ─────────── */}
          {!showDocked && (
            <div className="group/ctrl absolute inset-0 z-10 flex flex-col justify-end">
              {/* Gradient */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover/ctrl:opacity-100" />

              {/* Big center play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={togglePlay}
                  className={`flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-black/75 ${playing ? "opacity-0 group-hover/ctrl:opacity-100" : "opacity-100"}`}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  <span className="h-7 w-7">{playing ? <IconPause /> : <IconPlay />}</span>
                </button>
              </div>

              {/* Bottom controls */}
              <div className="relative translate-y-full px-4 pb-3 pt-10 transition-transform duration-200 group-hover/ctrl:translate-y-0">
                {/* Progress */}
                <div className="mb-2.5">
                  <ProgressBar progress={progress} onSeek={handleSeek} />
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="h-5 w-5 text-white/80 transition hover:text-white" aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <IconPause /> : <IconPlay />}
                  </button>

                  <button onClick={toggleMute} className="h-5 w-5 text-white/80 transition hover:text-white" aria-label={muted ? "Unmute" : "Mute"}>
                    {muted ? <IconMute /> : <IconVolume />}
                  </button>

                  <span className="text-xs tabular-nums text-white/60">
                    {formatTimestamp(Math.floor(currentTime))}
                    <span className="mx-1 text-white/30">/</span>
                    {formatTimestamp(Math.floor(duration))}
                  </span>

                  <div className="flex-1" />

                  {/* Jump to sermon */}
                  {sermonStart && showJump && (
                    <button
                      onClick={handleJump}
                      className="flex items-center gap-1.5 rounded-full bg-destiny-orange px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                    >
                      <span className="h-3.5 w-3.5"><IconSkip /></span>
                      Skip to {formatTimestamp(sermonStart)}
                    </button>
                  )}

                  <button onClick={handleFullscreen} className="h-5 w-5 text-white/80 transition hover:text-white" aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                    {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
