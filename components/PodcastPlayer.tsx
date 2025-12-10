"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Icon from "./Icon";
import { useGlobalAudio } from "./GlobalAudioProvider";
import { useContinueWatching } from "@/lib/continueWatching";

type PodcastPlayerProps = {
  sermonId: string;
  title: string;
  audioUrl: string;
  durationSeconds?: number;
};

const formatTime = (value?: number) => {
  if (!value || Number.isNaN(value)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const ACCENT_ORANGE = "#F58021";

export default function PodcastPlayer({
  sermonId,
  title,
  audioUrl,
  durationSeconds,
}: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { mounted, items, saveProgress, clearProgress } = useContinueWatching();
  const globalAudio = useGlobalAudio();
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasAppliedResume, setHasAppliedResume] = useState(false);
  const resumeFrom = useMemo(() => {
    if (!mounted) return 0;
    const match = items.find((item) => item.sermonId === sermonId);
    return match?.lastPosition ?? 0;
  }, [items, mounted, sermonId]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || hasAppliedResume || !mounted) return;

    const applyMetadata = () => {
      const metaDuration = Number.isFinite(el.duration) ? el.duration : durationSeconds ?? 0;
      setDuration(metaDuration || durationSeconds || 0);
      if (resumeFrom > 0 && resumeFrom < metaDuration - 1) {
        el.currentTime = resumeFrom;
        setCurrentTime(resumeFrom);
      }
      setHasAppliedResume(true);
    };

    if (el.readyState >= 1) {
      applyMetadata();
      return;
    }

    el.addEventListener("loadedmetadata", applyMetadata);
    return () => el.removeEventListener("loadedmetadata", applyMetadata);
  }, [durationSeconds, hasAppliedResume, mounted, resumeFrom]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = isMuted || volume === 0;
  }, [isMuted, volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
  }, [playbackRate]);

  const resolvedDuration = useMemo(() => {
    const fallback = duration || durationSeconds || 0;
    if (fallback > 0) return fallback;
    return Math.max(currentTime, 1);
  }, [currentTime, duration, durationSeconds]);

  const getRuntimeDuration = () => {
    const el = audioRef.current;
    const metaDuration = el && Number.isFinite(el.duration) ? el.duration : undefined;
    if (metaDuration && metaDuration > 0) return metaDuration;
    if (duration && duration > 0) return duration;
    if (durationSeconds && durationSeconds > 0) return durationSeconds;
    return Math.max(currentTime, 1);
  };

  const persistProgress = () => {
    const el = audioRef.current;
    if (!el) return;
    const nextTime = el.currentTime;
    setCurrentTime(nextTime);
    const playbackDuration = getRuntimeDuration();
    saveProgress(sermonId, nextTime, playbackDuration);
  };

  const togglePlay = async () => {
    if (globalAudio) {
      if (globalAudio.activeTrack?.sermonId === sermonId) {
        globalAudio.togglePlay();
      } else {
        globalAudio.playTrack({ sermonId, title, audioUrl, durationSeconds });
      }
      return;
    }
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
      } catch (error) {
        console.error("Unable to start audio", error);
      }
    } else {
      el.pause();
    }
  };

  const handleSeek = (next: number) => {
    if (isGlobalActive && globalAudio) {
      globalAudio.seekTo(next);
      return;
    }
    const el = audioRef.current;
    const cappedDuration = getRuntimeDuration();
    const safeTime = clamp(next, 0, cappedDuration);
    if (el) {
      el.currentTime = safeTime;
    }
    setCurrentTime(safeTime);
    saveProgress(sermonId, safeTime, cappedDuration);
  };

  const skipBy = (seconds: number) => {
    if (globalAudio) {
      if (!isGlobalActive) {
        globalAudio.playTrack({ sermonId, title, audioUrl, durationSeconds });
      }
      globalAudio.skipBy(seconds);
      return;
    }
    const el = audioRef.current;
    const base = el ? el.currentTime : currentTime;
    handleSeek(base + seconds);
  };

  const toggleMute = () => {
    if (isGlobalActive && globalAudio) {
      globalAudio.toggleMute();
      return;
    }
    const el = audioRef.current;
    const muted = isMuted || volume === 0;
    const nextMuted = !muted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.6);
      if (el) {
        el.volume = 0.6;
      }
    }
    if (el) {
      el.muted = nextMuted;
    }
  };

  const changeRate = () => {
    const speeds = [0.9, 1, 1.15, 1.35, 1.5] as const;
    const currentIndex = speeds.findIndex((speed) => speed === playbackRate);
    const nextRate = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(nextRate);
    const el = audioRef.current;
    if (el) {
      el.playbackRate = nextRate;
    }
  };

  const isGlobalActive = globalAudio?.activeTrack?.sermonId === sermonId;
  const effectiveCurrentTime = isGlobalActive ? globalAudio.currentTime : currentTime;
  const effectiveDuration = isGlobalActive ? globalAudio.duration || resolvedDuration : resolvedDuration;
  const effectiveIsPlaying = isGlobalActive ? globalAudio.isPlaying : isPlaying;
  const effectiveMuted = isGlobalActive ? globalAudio.isMuted : isMuted || volume === 0;

  const progressPercent = useMemo(
    () => clamp((effectiveCurrentTime / effectiveDuration) * 100, 0, 100),
    [effectiveCurrentTime, effectiveDuration],
  );
  const muted = effectiveMuted;
  const resumeBadgeValue = mounted && resumeFrom > 0 ? formatTime(resumeFrom) : null;
  const renderLocalAudio = !globalAudio;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(238,238,245,0.6))] text-black shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-colors dark:border-white/5 dark:bg-[linear-gradient(135deg,rgba(12,12,14,0.9),rgba(6,6,8,0.85))] dark:text-white"
      style={{ "--accent-orange": ACCENT_ORANGE } as CSSProperties}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
        <div className="absolute -left-16 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(245,128,33,0.35),transparent_60%)] blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(8,87,186,0.22),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative space-y-5 px-4 py-5 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[13px] text-black/70 dark:text-white/70">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black dark:bg-white/5 dark:text-white">
              <Icon name="graphic_eq" size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-black dark:text-white">{title}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-black/55 dark:text-white/50">
                Destiny Podcast
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-black/70 dark:text-white/70 sm:justify-end">
            {resumeBadgeValue ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-black dark:bg-white/10 dark:text-white">
                <Icon name="schedule" size={16} />
                Resume {resumeBadgeValue}
              </span>
            ) : (
              <a
                href={audioUrl}
                download
                className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-black transition hover:border-black/30 hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/5"
              >
                <Icon name="download" size={16} />
                Download
              </a>
            )}

            <button
              type="button"
              onClick={changeRate}
              className="group inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:border-black/25 hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/10"
            >
              {playbackRate.toFixed(2).replace(/\.00$/, "")}x
              <Icon
                name="speed"
                size={16}
                className="text-black/60 transition group-hover:text-black dark:text-white/60 dark:group-hover:text-white"
              />
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/60 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-white/5 dark:ring-white/10 sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <IconButton
              icon="replay_10"
              label="Back 15 seconds"
              badge="15"
              onClick={() => skipBy(-15)}
              className="h-11 w-11 sm:h-12 sm:w-12"
            />
            <IconButton
              icon="skip_previous"
              label="Restart"
              onClick={() => handleSeek(0)}
              className="h-11 w-11 sm:h-12 sm:w-12"
            />

            <div className="basis-full flex justify-center sm:basis-auto">
              <button
                type="button"
                aria-label={effectiveIsPlaying ? "Pause podcast" : "Play podcast"}
                onClick={togglePlay}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#f8962e] via-[#f58021] to-[#e56a11] text-white shadow-[0_12px_32px_rgba(245,128,33,0.42)] transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[rgba(245,128,33,0.45)] sm:h-[72px] sm:w-[72px]"
              >
                <Icon name={effectiveIsPlaying ? "pause" : "play_arrow"} size={32} />
              </button>
            </div>

            <IconButton
              icon="skip_next"
              label="Skip ahead"
              onClick={() => skipBy(30)}
              className="h-11 w-11 sm:h-12 sm:w-12"
            />
            <IconButton
              icon="forward_10"
              label="Ahead 15 seconds"
              badge="15"
              onClick={() => skipBy(15)}
              className="h-11 w-11 sm:h-12 sm:w-12"
            />
            <IconButton
              icon={muted ? "volume_off" : "volume_up"}
              label={muted ? "Unmute" : "Mute"}
              onClick={toggleMute}
              className="h-11 w-11 sm:h-12 sm:w-12"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 text-[12px] font-semibold text-black/70 dark:text-white/70 sm:flex-row sm:items-center sm:gap-3">
          <span className="tabular-nums text-black/80 dark:text-white/80">{formatTime(effectiveCurrentTime)}</span>
          <div className="relative flex-1">
            <div className="absolute inset-0 rounded-full bg-black/10 dark:bg-white/15" aria-hidden />
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              aria-hidden
              style={{ width: `${progressPercent}%`, backgroundColor: ACCENT_ORANGE }}
            />
            <input
              type="range"
              min={0}
              max={effectiveDuration}
              step={0.1}
              value={Math.min(effectiveCurrentTime, effectiveDuration)}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="relative z-10 h-3 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[--accent-orange] [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.35)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[--accent-orange] [&::-moz-range-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
              aria-label="Seek through audio"
            />
          </div>
          <span className="tabular-nums text-black/80 dark:text-white/80">{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {renderLocalAudio ? (
        <audio
          ref={audioRef}
          className="sr-only"
          src={audioUrl}
          preload="metadata"
          onTimeUpdate={persistProgress}
          onPause={() => {
            setIsPlaying(false);
            persistProgress();
          }}
          onSeeked={persistProgress}
          onPlay={() => setIsPlaying(true)}
          onLoadedData={() => setDuration(audioRef.current?.duration || durationSeconds || duration)}
          onDurationChange={() => setDuration(audioRef.current?.duration || durationSeconds || duration)}
          onEnded={() => {
            setIsPlaying(false);
            const endingDuration = getRuntimeDuration();
            setDuration(endingDuration);
            setCurrentTime(endingDuration);
            clearProgress(sermonId);
          }}
        />
      ) : null}
    </div>
  );
}

type ControlButtonProps = {
  icon: string;
  label: string;
  badge?: string;
  onClick: () => void;
  className?: string;
};

function IconButton({ icon, label, badge, onClick, className = "h-12 w-12" }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative inline-flex items-center justify-center rounded-full border border-black/10 bg-black/5 text-black shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:border-black/30 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-[rgba(245,128,33,0.35)] dark:border-white/8 dark:bg-white/5 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/10 dark:focus:ring-white/60 ${className}`}
    >
      <Icon name={icon} size={22} />
      {badge ? (
        <span className="absolute -bottom-1 -right-1 inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-white text-[11px] font-semibold uppercase tracking-wide text-black">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
