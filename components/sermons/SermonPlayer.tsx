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

  const canPlay = mounted && consent?.media === true;

  // Poll player state for global playing flag
  useEffect(() => {
    if (statePollRef.current) clearInterval(statePollRef.current);
    if (!canPlay) return;
    statePollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getPlayerState) return;
      setGlobalPlaying(p.getPlayerState() === 1);
    }, 500);
    return () => { if (statePollRef.current) clearInterval(statePollRef.current); };
  }, [canPlay, setGlobalPlaying]);

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
          controls: 1,
          iv_load_policy: 3,
        },
        events: {
          onStateChange: () => startJumpPolling(),
          onReady: () => {
            const iframe = containerRef.current?.querySelector("iframe");
            if (iframe) {
              iframe.setAttribute("allow", "autoplay; fullscreen");
              iframe.setAttribute("allowfullscreen", "");
            }
          },
        },
      });
    });
    return () => {
      if (jumpPollRef.current) clearInterval(jumpPollRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPlay, videoId]);

  const handleJump = () => {
    if (!sermonStart || !playerRef.current?.seekTo) return;
    playerRef.current.seekTo(sermonStart, true);
    playerRef.current.playVideo();
    startJumpPolling();
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
          <Image src={thumbnail} alt="Sermon thumbnail" fill className="object-cover opacity-30 blur-sm scale-105" sizes="(max-width: 1024px) 100vw, 740px" />
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

          {/* ── Skip to Sermon button (inline, above YouTube controls) ────── */}
          {!showDocked && sermonStart && showJump && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-start p-3">
              <button
                className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-destiny-orange px-3 py-1.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
                onClick={handleJump}
              >
                <span className="h-3.5 w-3.5"><IconSkip /></span>
                Skip to Sermon ({formatTimestamp(sermonStart)})
              </button>
            </div>
          )}

          {/* ── Desktop PiP overlay (draggable, close button) ──────────────── */}
          {isDesktopDock && (
            <div
              className="absolute inset-0 z-10 flex cursor-grab flex-col justify-between active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* Top bar — drag handle + close */}
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
            </div>
          )}

          {/* ── Mobile dock overlay (scroll-back button) ─────────────────── */}
          {isMobileDock && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <button
                onClick={() => sentinelRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="pointer-events-auto absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/60 transition hover:text-white"
                aria-label="Scroll to player"
              >
                <span className="h-3.5 w-3.5"><IconScrollUp /></span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
