"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Icon from "./Icon";
import { useGlobalAudio } from "./GlobalAudioProvider";
import { useContinueWatching } from "@/lib/continueWatching";
import { useSettings } from "@/lib/settings";

type PodcastPlayerProps = {
  sermonId: string;
  title: string;
  audioUrl: string;
  durationSeconds?: number;
};

const ACCENT_ORANGE = "#F58021";

const formatTime = (value?: number) => {
  if (!value || Number.isNaN(value)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function PodcastPlayer({ sermonId, title, audioUrl, durationSeconds }: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { mounted, items, saveProgress, clearProgress } = useContinueWatching();
  const globalAudio = useGlobalAudio();
  const { settings, updateSetting } = useSettings();

  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAppliedResume, setHasAppliedResume] = useState(false);
  const hasGlobalAudio = Boolean(globalAudio);
  const playbackRate = settings.playbackSpeed;

  const resumeEntry = useMemo(
    () => items.find((item) => item.sermonId === sermonId),
    [items, sermonId],
  );
  const resumeFrom = useMemo(() => {
    if (!mounted || !settings.continueWatching || settings.resumePlayback !== "resume") return 0;
    return resumeEntry?.lastPosition ?? 0;
  }, [mounted, resumeEntry, settings.continueWatching, settings.resumePlayback]);
  const resumeDuration = resumeEntry?.durationSeconds ?? 0;

  useEffect(() => {
    if (!hasGlobalAudio) return;
    if (!audioUrl) return;
    if (durationSeconds && durationSeconds > 0) return;
    if (resumeDuration && resumeDuration > 0) return;
    if (duration > 0) return;

    let cancelled = false;
    const probe = new Audio();
    probe.preload = "metadata";
    probe.src = audioUrl;

    const handleMetadata = () => {
      if (cancelled) return;
      const metaDuration = Number.isFinite(probe.duration) ? probe.duration : 0;
      if (metaDuration > 0) {
        setDuration(metaDuration);
      }
    };

    probe.addEventListener("loadedmetadata", handleMetadata);
    probe.addEventListener("durationchange", handleMetadata);
    probe.load();

    return () => {
      cancelled = true;
      probe.removeEventListener("loadedmetadata", handleMetadata);
      probe.removeEventListener("durationchange", handleMetadata);
      probe.src = "";
    };
  }, [audioUrl, duration, durationSeconds, hasGlobalAudio, resumeDuration]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || hasAppliedResume || !mounted) return;

    const applyMetadata = () => {
      const metaDuration = Number.isFinite(el.duration) ? el.duration : durationSeconds ?? resumeDuration ?? 0;
      setDuration(metaDuration || durationSeconds || resumeDuration || 0);
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
  }, [durationSeconds, hasAppliedResume, mounted, resumeDuration, resumeFrom]);

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
    el.playbackRate = settings.playbackSpeed;
  }, [settings.playbackSpeed]);

  const resolvedDuration = useMemo(() => {
    const fallback = duration || durationSeconds || resumeDuration || 0;
    if (fallback > 0) return fallback;
    return Math.max(currentTime, 1);
  }, [currentTime, duration, durationSeconds, resumeDuration]);

  const getRuntimeDuration = () => {
    const el = audioRef.current;
    const metaDuration = el && Number.isFinite(el.duration) ? el.duration : undefined;
    if (metaDuration && metaDuration > 0) return metaDuration;
    if (duration && duration > 0) return duration;
    if (durationSeconds && durationSeconds > 0) return durationSeconds;
    if (resumeDuration && resumeDuration > 0) return resumeDuration;
    return Math.max(currentTime, 1);
  };

  const persistProgress = () => {
    if (!settings.continueWatching) return;
    const el = audioRef.current;
    if (!el) return;
    const nextTime = el.currentTime;
    setCurrentTime(nextTime);
    const playbackDuration = getRuntimeDuration();
    saveProgress(sermonId, nextTime, playbackDuration);
  };

  const isGlobalActive = globalAudio?.activeTrack?.sermonId === sermonId;

  const togglePlay = async () => {
    if (globalAudio) {
      if (isGlobalActive) {
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
    if (settings.continueWatching) {
      saveProgress(sermonId, safeTime, cappedDuration);
    }
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

  const handleResume = async () => {
    if (!resumeFrom) return;
    if (globalAudio) {
      if (!isGlobalActive) {
        globalAudio.playTrack({ sermonId, title, audioUrl, durationSeconds });
        return;
      }
      globalAudio.seekTo(resumeFrom);
      if (!globalAudio.isPlaying) {
        globalAudio.togglePlay();
      }
      return;
    }
    handleSeek(resumeFrom);
    const el = audioRef.current;
    if (!el || !el.paused) return;
    try {
      await el.play();
    } catch (error) {
      console.error("Unable to resume audio", error);
    }
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
      if (el) el.volume = 0.6;
    }
    if (el) el.muted = nextMuted;
  };

  const changeRate = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2] as const;
    const currentIndex = speeds.findIndex((speed) => speed === playbackRate);
    const nextRate = speeds[(currentIndex + 1) % speeds.length];
    updateSetting("playbackSpeed", nextRate);
    const el = audioRef.current;
    if (el) el.playbackRate = nextRate;
  };

  const effectiveCurrentTime = isGlobalActive ? globalAudio.currentTime : currentTime;
  const effectiveDuration = isGlobalActive ? globalAudio.duration || resolvedDuration : resolvedDuration;
  const effectiveIsPlaying = isGlobalActive ? globalAudio.isPlaying : isPlaying;
  const effectiveMuted = isGlobalActive ? globalAudio.isMuted : isMuted || volume === 0;
  const progressPercent = useMemo(
    () => clamp((effectiveCurrentTime / effectiveDuration) * 100, 0, 100),
    [effectiveCurrentTime, effectiveDuration],
  );
  const resumeBadgeValue = mounted && resumeFrom > 0 ? formatTime(resumeFrom) : null;
  const renderLocalAudio = !globalAudio;

  return (
    <div
      className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-[var(--foreground)] shadow-sm"
      style={{ "--accent-orange": ACCENT_ORANGE } as CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
            <Icon name="graphic_eq" size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{title}</p>
            <p className="text-xs text-destiny-grey">Destiny Church Tees Valley</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-destiny-grey">
          {resumeBadgeValue ? (
            <button
              type="button"
              onClick={handleResume}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2.5 py-1 transition hover:border-destiny-orange hover:text-destiny-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
            >
              <Icon name="schedule" size={15} />
              Resume {resumeBadgeValue}
            </button>
          ) : (
            <a
              href={audioUrl}
              download
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2.5 py-1 transition hover:border-destiny-orange hover:text-destiny-orange"
            >
              <Icon name="download" size={15} />
              Download
            </a>
          )}
          <button
            type="button"
            aria-label="Wi-Fi casting"
            disabled
            aria-disabled="true"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-1 text-destiny-grey/80 opacity-75"
          >
            <Icon name="cast" size={15} />
            Wi-Fi casting
            <span className="rounded-full border border-dashed border-destiny-grey/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-destiny-grey/70">
              Coming soon
            </span>
          </button>
          <button
            type="button"
            onClick={changeRate}
            className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-semibold transition hover:border-destiny-orange hover:text-destiny-orange"
          >
            {playbackRate.toFixed(2).replace(/\.00$/, "")}x
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <IconButton icon="replay_10" label="Back 15 seconds" onClick={() => skipBy(-15)} />
        <button
          type="button"
          aria-label={effectiveIsPlaying ? "Pause podcast" : "Play podcast"}
          onClick={togglePlay}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-destiny-orange text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
        >
          <Icon name={effectiveIsPlaying ? "pause" : "play_arrow"} size={26} />
        </button>
        <IconButton icon="forward_10" label="Ahead 15 seconds" onClick={() => skipBy(15)} />
        <IconButton icon={effectiveMuted ? "volume_off" : "volume_up"} label={effectiveMuted ? "Unmute" : "Mute"} onClick={toggleMute} />
      </div>

      <div className="flex flex-col gap-1 text-xs font-semibold text-destiny-grey sm:flex-row sm:items-center sm:gap-3">
        <span className="tabular-nums text-[var(--foreground)]">{formatTime(effectiveCurrentTime)}</span>
        <div className="relative flex-1">
          <div className="absolute inset-0 rounded-full bg-[var(--surface-muted)]" aria-hidden />
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
            className="relative z-10 h-3 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[--accent-orange] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[--accent-orange]"
            aria-label="Seek through audio"
          />
        </div>
        <span className="tabular-nums text-[var(--foreground)]">{formatTime(effectiveDuration)}</span>
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
            if (settings.continueWatching) {
              clearProgress(sermonId);
            }
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

function IconButton({ icon, label, badge, onClick, className = "h-11 w-11" }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative inline-flex items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--foreground)] shadow-xs transition hover:border-destiny-orange hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange ${className}`}
    >
      <Icon name={icon} size={20} />
      {badge ? (
        <span className="absolute -bottom-1 -right-1 inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-white text-[11px] font-semibold uppercase tracking-wide text-black">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
