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

  // Drag (desktop PiP)
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const didDrag = useRef(false);
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

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || (e.target as HTMLElement).closest("iframe, button")) return;
    dragging.current = true;
    didDrag.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    didDrag.current = true;
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

  /*
   * The player div (containerRef) must remain in the DOM without unmounting,
   * or the YT iframe gets destroyed. We keep ONE wrapper that switches between
   * inline (relative, inside sentinel) and docked (fixed/sticky) via className + style.
   *
   * Mobile docked  → sticky top-0, full width
   * Desktop docked → fixed bottom-right, 360px, draggable
   * Not docked     → relative, fills the sentinel
   */
  const wrapperClass = showDocked
    ? isMobile
      ? "sticky top-0 z-40 w-full bg-black shadow-lg shadow-black/40"
      : "fixed z-50 overflow-hidden rounded-xl shadow-2xl shadow-black/60"
    : "relative w-full overflow-hidden rounded-2xl";

  const wrapperStyle: React.CSSProperties = showDocked && !isMobile
    ? { right: pos.x, bottom: pos.y, width: 360, cursor: dragging.current ? "grabbing" : "grab" }
    : {};

  return (
    <div ref={sentinelRef} style={{ aspectRatio: "16/9" }}>
      <div
        ref={wrapperRef}
        className={wrapperClass}
        style={wrapperStyle}
        onPointerDown={showDocked && !isMobile ? onPointerDown : undefined}
        onPointerMove={showDocked && !isMobile ? onPointerMove : undefined}
        onPointerUp={showDocked && !isMobile ? onPointerUp : undefined}
      >
        <div className="relative aspect-video w-full bg-black">
          <div ref={containerRef} className="h-full w-full" />

          {/* Close — desktop docked only */}
          {showDocked && !isMobile && (
            <button
              onClick={() => setDismissed(true)}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/60 transition hover:bg-black hover:text-white"
              aria-label="Close mini player"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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

          {/* Drag handle — desktop docked */}
          {showDocked && !isMobile && (
            <div className="pointer-events-none absolute left-1/2 top-1.5 -translate-x-1/2">
              <div className="h-1 w-8 rounded-full bg-white/20" />
            </div>
          )}

          {/* Jump to sermon */}
          {sermonStart && showJump && (
            <button
              onClick={handleJump}
              className={`absolute flex items-center gap-1.5 rounded-full bg-destiny-orange font-bold text-white shadow-lg shadow-black/40 transition hover:brightness-110 ${
                showDocked && !isMobile
                  ? "bottom-2 right-2 gap-1 px-3 py-1.5 text-xs"
                  : "bottom-4 right-4 gap-2 px-4 py-2.5 text-sm"
              }`}
            >
              <span className={`material-symbols-rounded ${showDocked && !isMobile ? "text-sm" : "text-lg"}`}>fast_forward</span>
              {showDocked && !isMobile ? `Skip (${formatTimestamp(sermonStart)})` : `Skip to Sermon (${formatTimestamp(sermonStart)})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
