"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import type { PodcastEpisode } from "@/lib/podcast";
import { formatClock } from "@/lib/podcast";

interface PlayerState {
  current: PodcastEpisode | null;
  isPlaying: boolean;
  /** 0..1 progress of the active episode (live). */
  progress: number;
  currentTime: number;
  duration: number;
  /** Toggle play for an episode. If it's already the active one, pause/resume. */
  toggle: (ep: PodcastEpisode) => void;
  isActive: (id: string) => boolean;
}

const Ctx = createContext<PlayerState | null>(null);

export function usePodcastPlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePodcastPlayer must be used within provider");
  return ctx;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2];

export function PodcastPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState<PodcastEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = useCallback(
    (ep: PodcastEpisode) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (current?.id === ep.id) {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      setCurrent(ep);
      setCurrentTime(0);
      setDuration(ep.durationSeconds || 0);
      audio.src = ep.audioUrl;
      audio.playbackRate = SPEEDS[speedIdx];
      audio.play().catch(() => {});
    },
    [current, speedIdx]
  );

  const isActive = useCallback((id: string) => current?.id === id, [current]);

  // Wire audio element events.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      if (!scrubbing) setCurrentTime(audio.currentTime);
    };
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, [scrubbing]);

  // Media Session metadata for OS-level controls.
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.speaker ?? "Destiny Church Tees Valley",
      album: "DCTV Podcast",
      artwork: [{ src: current.image, sizes: "512x512", type: "image/jpeg" }],
    });
  }, [current]);

  const seekBy = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.duration || 0, audio.currentTime + delta)
    );
  };

  const seekTo = (fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = fraction * audio.duration;
    setCurrentTime(audio.currentTime);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  // Share the episode — Buzzsprout's episode page is the .mp3 enclosure minus ".mp3".
  const handleShare = async () => {
    if (!current) return;
    const url = current.audioUrl.replace(/\.mp3(\?.*)?$/, "");
    const data = {
      title: current.title,
      text: `${current.title} — DCTV Podcast`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      return; // user dismissed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — nothing else to do */
    }
  };

  // Tapping the compact bar opens the full-screen view — mobile only.
  const openOnMobile = () => {
    if (window.matchMedia("(max-width: 639px)").matches) setExpanded(true);
  };

  // Lock background scroll while the full-screen player is open.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  // Publish the docked bar's height as a CSS var so other fixed-bottom UI
  // (e.g. Smart Search) can lift above it instead of overlapping its controls.
  useEffect(() => {
    const root = document.documentElement;
    const el = dockRef.current;
    if (!current || !el) {
      root.style.setProperty("--podcast-dock-height", "0px");
      return;
    }
    const apply = () =>
      root.style.setProperty("--podcast-dock-height", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--podcast-dock-height", "0px");
    };
  }, [current]);

  const progress = duration ? currentTime / duration : 0;

  return (
    <Ctx.Provider
      value={{
        current,
        isPlaying,
        progress,
        currentTime,
        duration,
        toggle,
        isActive,
      }}
    >
      {children}

      {/* Single persistent audio element */}
      <audio ref={audioRef} preload="metadata" />

      {/* Docked player bar */}
      {current && (
        <div ref={dockRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-5 sm:pb-5">
          <div className="glass glass-xl glass-refract pointer-events-auto relative mx-auto flex max-w-5xl items-center gap-3 overflow-hidden rounded-2xl bg-[#141210]/85 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
            {/* Mobile-only progress line along the bottom edge */}
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10 sm:hidden">
              <div
                className="h-full bg-destiny-orange"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {/* Artwork — tap to expand on mobile */}
            <button
              type="button"
              onClick={openOnMobile}
              aria-label="Open full player"
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-14 sm:w-14 sm:cursor-default"
            >
              <Image
                src={current.image}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </button>

            {/* Title + scrubber */}
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={openOnMobile}
                className="block w-full truncate text-left text-[13px] font-bold leading-tight text-white sm:cursor-default sm:text-sm"
              >
                {current.title}
              </button>
              {/* Desktop scrubber (mobile uses the bottom progress line + tap-to-expand) */}
              <div className="mt-1.5 hidden items-center gap-2 sm:flex">
                <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-white/40">
                  {formatClock(currentTime)}
                </span>
                <Scrubber
                  progress={progress}
                  onScrubStart={() => setScrubbing(true)}
                  onScrub={(f) => setCurrentTime(f * (duration || 0))}
                  onScrubEnd={(f) => {
                    setScrubbing(false);
                    seekTo(f);
                  }}
                />
                <span className="w-9 shrink-0 font-mono text-[10px] tabular-nums text-white/40">
                  {formatClock(duration)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => seekBy(-15)}
                className="hidden h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white sm:flex"
                aria-label="Rewind 15 seconds"
              >
                <span className="material-symbols-rounded text-[22px]">
                  replay
                </span>
              </button>
              <button
                onClick={() => current && toggle(current)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-destiny-orange text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <span className="material-symbols-rounded text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
              <button
                onClick={() => seekBy(30)}
                className="hidden h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white sm:flex"
                aria-label="Forward 30 seconds"
              >
                <span className="material-symbols-rounded text-[22px]">
                  forward_media
                </span>
              </button>
              <button
                onClick={cycleSpeed}
                className="ml-0.5 hidden h-9 min-w-[44px] items-center justify-center rounded-full border border-white/15 px-2 font-mono text-xs font-bold text-white/70 transition hover:border-white/40 hover:text-white sm:flex"
                aria-label="Playback speed"
              >
                {SPEEDS[speedIdx]}×
              </button>
              <button
                onClick={handleShare}
                className="hidden h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white sm:flex"
                aria-label="Share episode"
              >
                <span className="material-symbols-rounded text-[20px]">
                  {copied ? "check" : "ios_share"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen player (mobile) — Spotify-style expanded view */}
      {current && (
        <div
          className={`fixed inset-0 z-[60] transition-transform duration-300 ease-out sm:hidden ${
            expanded ? "translate-y-0" : "pointer-events-none translate-y-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Now playing"
        >
          <div className="flex h-full flex-col bg-gradient-to-b from-[#2a1d12] via-[#15100c] to-black px-6 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpanded(false)}
                aria-label="Collapse player"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <span className="material-symbols-rounded text-3xl">
                  keyboard_arrow_down
                </span>
              </button>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">
                Now Playing
              </span>
              <span className="h-10 w-10" aria-hidden />
            </div>

            {/* Artwork */}
            <div className="flex flex-1 items-center justify-center py-6">
              <div className="relative aspect-square w-full max-w-[20rem] overflow-hidden rounded-3xl shadow-2xl shadow-black/60">
                <Image
                  src={current.image}
                  alt=""
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Title + speaker + share */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-black leading-snug text-white line-clamp-2">
                  {current.title}
                </h2>
                <p className="mt-1 truncate text-sm text-white/50">
                  {current.speaker ?? "Destiny Church Tees Valley"}
                </p>
              </div>
              <button
                onClick={handleShare}
                aria-label="Share episode"
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <span className="material-symbols-rounded text-[22px]">
                  {copied ? "check" : "ios_share"}
                </span>
              </button>
            </div>

            {/* Scrubber */}
            <div className="mt-6">
              <Scrubber
                progress={progress}
                onScrubStart={() => setScrubbing(true)}
                onScrub={(f) => setCurrentTime(f * (duration || 0))}
                onScrubEnd={(f) => {
                  setScrubbing(false);
                  seekTo(f);
                }}
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-white/45">
                <span>{formatClock(currentTime)}</span>
                <span>{formatClock(duration)}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={cycleSpeed}
                aria-label="Playback speed"
                className="flex h-11 min-w-[52px] items-center justify-center rounded-full border border-white/15 px-3 font-mono text-sm font-bold text-white/70 transition hover:border-white/40 hover:text-white"
              >
                {SPEEDS[speedIdx]}×
              </button>

              <div className="flex items-center gap-7">
                <button
                  onClick={() => seekBy(-15)}
                  aria-label="Rewind 15 seconds"
                  className="text-white/85 transition hover:text-white"
                >
                  <span className="material-symbols-rounded text-[34px]">replay</span>
                </button>
                <button
                  onClick={() => current && toggle(current)}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-destiny-orange text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110"
                >
                  <span
                    className="material-symbols-rounded text-4xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>
                <button
                  onClick={() => seekBy(30)}
                  aria-label="Forward 30 seconds"
                  className="text-white/85 transition hover:text-white"
                >
                  <span className="material-symbols-rounded text-[34px]">
                    forward_media
                  </span>
                </button>
              </div>

              <span className="h-11 w-[52px]" aria-hidden />
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

function Scrubber({
  progress,
  onScrubStart,
  onScrub,
  onScrubEnd,
}: {
  progress: number;
  onScrubStart: () => void;
  onScrub: (fraction: number) => void;
  onScrubEnd: (fraction: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fractionFromEvent = (clientX: number) => {
    const el = ref.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    onScrubStart();
    e.currentTarget.setPointerCapture(e.pointerId);
    onScrub(fractionFromEvent(e.clientX));
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    onScrub(fractionFromEvent(e.clientX));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    onScrubEnd(fractionFromEvent(e.clientX));
  };

  const pct = `${Math.round(progress * 1000) / 10}%`;

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      className="group relative h-4 flex-1 cursor-pointer touch-none"
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-destiny-orange to-amber-300"
          style={{ width: pct }}
        />
      </div>
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition group-hover:opacity-100"
        style={{ left: pct }}
      />
    </div>
  );
}
