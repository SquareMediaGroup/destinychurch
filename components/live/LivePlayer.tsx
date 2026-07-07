/// <reference types="youtube" />
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCookieConsent } from "@/lib/cookieConsent";
import { loadYTApi } from "@/lib/youtubeIframe";

interface LivePlayerProps {
  videoId: string;
  onEnded?: () => void;
}

export default function LivePlayer({ videoId, onEnded }: LivePlayerProps) {
  const { consent, allowAll, savePreferences } = useCookieConsent();
  const [mounted, setMounted] = useState(false);

  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const statePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(100);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasUnmuted, setHasUnmuted] = useState(false);

  useEffect(() => setMounted(true), []);

  const canPlay = mounted && consent?.media === true;
  const reducedMotion =
    typeof document !== "undefined" &&
    document.documentElement.dataset.motion === "reduced";

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (reducedMotion) return;
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, [reducedMotion]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // Mount YT player
  useEffect(() => {
    if (!canPlay || !containerRef.current) return;
    loadYTApi(() => {
      if (playerRef.current) playerRef.current.destroy();
      playerRef.current = new window.YT!.Player(containerRef.current! as unknown as string, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
        },
        events: {
          onReady: () => {
            setReady(true);
            playerRef.current?.playVideo();
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === window.YT!.PlayerState.ENDED) {
              onEnded?.();
            }
            setPlaying(e.data === window.YT!.PlayerState.PLAYING);
          },
        },
      });
    });
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPlay, videoId]);

  // Poll mute/volume state (no events for these on the IFrame API)
  useEffect(() => {
    if (!ready) return;
    statePollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.isMuted) return;
      setMuted(p.isMuted());
      setVolume(p.getVolume?.() ?? 100);
    }, 500);
    return () => {
      if (statePollRef.current) clearInterval(statePollRef.current);
    };
  }, [ready]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
    showControls();
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      if (p.getVolume() === 0) p.setVolume(100);
      setHasUnmuted(true);
    } else {
      p.mute();
    }
    showControls();
  };

  const onVolumeChange = (v: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(v);
    if (v > 0 && p.isMuted()) {
      p.unMute();
      setHasUnmuted(true);
    }
    if (v === 0) p.mute();
    setVolume(v);
    showControls();
  };

  const goToLiveEdge = () => {
    const p = playerRef.current;
    if (!p?.seekTo) return;
    p.seekTo(p.getDuration(), true);
    p.playVideo();
    showControls();
  };

  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    }
    showControls();
  };

  if (!mounted || !canPlay) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-[#111]">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-6 text-center">
          <span className="material-symbols-rounded text-5xl text-white/40">cookie</span>
          <div>
            <p className="text-base font-black text-white">Cookies required to play video</p>
            <p className="mt-1 max-w-xs text-sm text-white/50">
              YouTube uses cookies to serve this stream. Accept them to watch.
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
    <div
      ref={wrapperRef}
      className="group absolute inset-0 overflow-hidden rounded-2xl bg-black"
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onPointerDown={showControls}
    >
      <div ref={containerRef} className="h-full w-full" />

      {ready && !hasUnmuted && (
        <button
          onClick={toggleMute}
          className="glass glass-pill absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white"
        >
          <span className="material-symbols-rounded text-lg">volume_off</span>
          Tap to unmute
        </button>
      )}

      {/* Bottom gradient + glass control bar */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end px-3 pb-3 pt-10 transition-opacity duration-300"
        style={{
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? "auto" : "none",
          background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
        }}
      >
        <div className="glass glass-strong glass-refract flex items-center gap-3 rounded-2xl px-3 py-2">
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          >
            <span className="material-symbols-rounded text-2xl">
              {playing ? "pause" : "play_arrow"}
            </span>
          </button>

          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          >
            <span className="material-symbols-rounded text-xl">
              {muted || volume === 0 ? "volume_off" : "volume_up"}
            </span>
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="hidden w-20 accent-destiny-orange sm:block"
            aria-label="Volume"
          />

          <button
            onClick={goToLiveEdge}
            className="ml-1 flex items-center gap-1.5 rounded-full bg-destiny-red px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:brightness-110"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"
            />
            Live
          </button>

          <div className="flex-1" />

          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          >
            <span className="material-symbols-rounded text-xl">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
