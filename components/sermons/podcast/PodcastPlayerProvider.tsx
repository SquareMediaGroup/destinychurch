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
  const [current, setCurrent] = useState<PodcastEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

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
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-5 sm:pb-5">
          <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-white/10 bg-[#141210]/85 px-3 py-2.5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:gap-4 sm:px-4 sm:py-3">
            {/* Artwork */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-14 sm:w-14">
              <Image
                src={current.image}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>

            {/* Title + scrubber */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-tight text-white sm:text-sm">
                {current.title}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="hidden w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-white/40 sm:inline">
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
                <span className="hidden w-9 shrink-0 font-mono text-[10px] tabular-nums text-white/40 sm:inline">
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
