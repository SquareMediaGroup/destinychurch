/// <reference types="youtube" />
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCookieConsent } from "@/lib/cookieConsent";
import { useSermonPlayerState } from "@/lib/sermonPlayerContext";
import { loadYTApi } from "@/lib/youtubeIframe";
import { useSermonJump } from "./SermonJumpContext";

interface SermonPlayerProps {
  videoId: string;
  thumbnail?: string;
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

export default function SermonPlayer({ videoId, thumbnail }: SermonPlayerProps) {
  const { consent, allowAll, savePreferences } = useCookieConsent();
  const [mounted, setMounted] = useState(false);

  const { jumpFnRef, hideJump, sermonStart } = useSermonJump();

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

  const canPlay = mounted && consent?.media === true;

  // Poll for global playing state
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

  // Poll to auto-hide the skip button when sermon is reached
  const startJumpPolling = useCallback(() => {
    if (!sermonStart) return;
    if (jumpPollRef.current) clearInterval(jumpPollRef.current);
    jumpPollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      if (p.getCurrentTime() >= sermonStart) {
        hideJump();
        if (jumpPollRef.current) clearInterval(jumpPollRef.current);
      }
    }, 1000);
  }, [sermonStart, hideJump]);

  useEffect(() => () => { if (jumpPollRef.current) clearInterval(jumpPollRef.current); }, []);

  // Mount YT player
  useEffect(() => {
    if (!canPlay || !containerRef.current) return;
    loadYTApi(() => {
      if (playerRef.current) playerRef.current.destroy();
      playerRef.current = new window.YT!.Player(containerRef.current! as unknown as string, {
        videoId,
        playerVars: { modestbranding: 1, rel: 0, autoplay: 0, controls: 1, iv_load_policy: 3 },
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

  // Register the jump function in the shared context ref
  useEffect(() => {
    jumpFnRef.current = () => {
      if (!sermonStart || !playerRef.current?.seekTo) return;
      playerRef.current.seekTo(sermonStart, true);
      playerRef.current.playVideo();
      startJumpPolling();
    };
  }, [jumpFnRef, sermonStart, startJumpPolling]);

  // Drag handlers (desktop PiP)
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
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-[#111]">
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
              Necessary + media only, no tracking
            </button>
          </div>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-white/40">
            By accepting, you agree to our{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-destiny-orange">Privacy Policy</Link>{" "}
            and{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-destiny-orange">Terms of Use</Link>.
          </p>
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
    : "absolute inset-0 overflow-hidden rounded-2xl";

  const wrapperStyle: React.CSSProperties = isDesktopDock ? { right: pos.x, bottom: pos.y, width: 360 } : {};

  return (
    <div ref={sentinelRef} className="absolute inset-0">
      <div ref={wrapperRef} className={wrapperClass} style={wrapperStyle}>
        <div className="relative aspect-video w-full bg-black">
          <div ref={containerRef} className="h-full w-full" />

          {isDesktopDock && (
            <div
              className="absolute inset-0 z-10 flex cursor-grab flex-col justify-between active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
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
