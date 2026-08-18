/// <reference types="youtube" />
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useCookieConsent } from "@/lib/cookieConsent";
import { useIsClient } from "@/lib/useIsClient";
import { loadYTApi } from "@/lib/youtubeIframe";

interface LivePlayerProps {
  videoId: string;
  onEnded?: () => void;
  /**
   * Simulated live. Returns the second of the video everyone should be at right
   * now, from the shared clock in LiveContext. Its presence is what switches
   * this player from "real stream" to "pre-uploaded video pretending to be one":
   * it starts there instead of at zero, holds itself there, and treats the end
   * of the video as the end of the broadcast.
   *
   * Passed as a getter rather than a number on purpose. A number would change
   * every second and re-key the effect that owns the iframe, tearing the player
   * down and rebuilding it mid-service.
   */
  getTargetTime?: () => number;
}

/** Seconds out of sync before the playhead is pulled back. */
const DRIFT_TOLERANCE = 5;
/** How often to check. Frequent enough to be invisible, rare enough to be free. */
const DRIFT_CHECK_MS = 10_000;

export default function LivePlayer({ videoId, onEnded, getTargetTime }: LivePlayerProps) {
  const { consent, allowAll, savePreferences } = useCookieConsent();
  const mounted = useIsClient();

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

  // Held in a ref so the player-mount effect can stay keyed on the video id
  // alone: re-running it on every parent render would tear down and rebuild the
  // iframe mid-service.
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // Same reasoning as onEnded, and the same reason `simulated` below is derived
  // from a ref rather than the prop: neither may re-key the mount effect.
  const targetTimeRef = useRef(getTargetTime);
  useEffect(() => {
    targetTimeRef.current = getTargetTime;
  }, [getTargetTime]);
  const simulated = Boolean(getTargetTime);

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
          // Simulated live: drop straight in at the point everyone else is at.
          // Passing it as a player var rather than seeking after onReady means
          // YouTube buffers from there, so nobody sees the opening seconds of
          // the service flash past before the jump.
          start: simulated
            ? Math.max(0, Math.floor(targetTimeRef.current?.() ?? 0))
            : undefined,
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
              onEndedRef.current?.();
            }
            setPlaying(e.data === window.YT!.PlayerState.PLAYING);
          },
          // A pulled or privated broadcast leaves the player wedged on a black
          // rectangle; treat it the same as the stream ending so the page falls
          // back to the offline card.
          onError: () => onEndedRef.current?.(),
        },
      });
    });
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      setReady(false);
    };
    // `simulated` is read through a ref-backed getter and never changes for a
    // given broadcast, so it is deliberately not a dependency: re-running this
    // rebuilds the iframe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPlay, videoId]);

  /**
   * Simulated live has no DVR. The whole point is that everyone is at the same
   * moment, so the playhead is pulled back whenever it drifts — from buffering,
   * from a phone locking mid-service, from a tab that got throttled in the
   * background. Only while the viewer is actually watching: someone who pressed
   * pause has chosen to stop, and yanking a paused player forward would be a
   * jump-scare rather than a sync. Pressing play again catches them up.
   */
  useEffect(() => {
    if (!ready || !simulated) return;

    const id = setInterval(() => {
      const p = playerRef.current;
      const target = targetTimeRef.current?.();
      if (!p?.getCurrentTime || target === undefined) return;

      // Past the end of the video is the end of the broadcast, whether or not
      // the ENDED event has fired — it doesn't when the tab was asleep.
      const duration = p.getDuration?.() ?? 0;
      if (duration > 0 && target >= duration - 1) {
        onEndedRef.current?.();
        return;
      }

      // Asked of the player rather than tracked in state: a viewer who pressed
      // pause has chosen to stop, and yanking a paused player forward would be
      // a jump-scare rather than a sync.
      if (p.getPlayerState?.() !== window.YT?.PlayerState.PLAYING) return;
      if (Math.abs(p.getCurrentTime() - target) > DRIFT_TOLERANCE) {
        p.seekTo(target, true);
      }
    }, DRIFT_CHECK_MS);

    return () => clearInterval(id);
  }, [ready, simulated]);

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
    if (playing) {
      p.pauseVideo();
    } else {
      // Resuming a simulated broadcast rejoins it where it is now, not where it
      // was when you paused — the same thing pressing play on a real live
      // stream does.
      const target = targetTimeRef.current?.();
      if (target !== undefined) p.seekTo(target, true);
      p.playVideo();
    }
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
    // For a real stream the live edge is the end of the buffer. For a simulated
    // one it is wherever the shared clock says the service has got to — the end
    // of the file is where the broadcast *finishes*, which is not the same
    // thing and would skip the rest of the service.
    const target = targetTimeRef.current?.() ?? p.getDuration();
    p.seekTo(target, true);
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
