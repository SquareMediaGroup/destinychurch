"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import MiniPodcastPlayer from "./MiniPodcastPlayer";
import { useContinueWatching } from "@/lib/continueWatching";

type Track = {
  sermonId: string;
  title: string;
  audioUrl: string;
  durationSeconds?: number;
};

type GlobalAudioContextValue = {
  activeTrack: Track | null;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  seekTo: (next: number) => void;
  skipBy: (seconds: number) => void;
  toggleMute: () => void;
  close: () => void;
};

const GlobalAudioContext = createContext<GlobalAudioContextValue | null>(null);

export const useGlobalAudio = () => useContext(GlobalAudioContext);

const allowedRoots = ["/sermons", "/playlists", "/cookies", "/privacy-policy", "/terms"];

const isAllowedPath = (pathname: string) => {
  if (pathname.startsWith("/admin")) return false;
  if (pathname === "/") return true;
  return allowedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
};

export default function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const allowed = isAllowedPath(pathname);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { mounted, items, saveProgress, clearProgress } = useContinueWatching();

  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAppliedResume, setHasAppliedResume] = useState(false);
  const [pendingAutoplay, setPendingAutoplay] = useState(false);

  const resumeFrom = useMemo(() => {
    if (!mounted || !activeTrack) return 0;
    const match = items.find((item) => item.sermonId === activeTrack.sermonId);
    return match?.lastPosition ?? 0;
  }, [activeTrack, items, mounted]);

  useEffect(() => {
    if (!allowed && activeTrack) {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !activeTrack || hasAppliedResume) return;

    const applyMetadata = () => {
      const metaDuration = Number.isFinite(el.duration) ? el.duration : activeTrack.durationSeconds ?? 0;
      setDuration(metaDuration || activeTrack.durationSeconds || 0);
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
  }, [activeTrack, hasAppliedResume, resumeFrom]);

  useEffect(() => {
    if (!pendingAutoplay) return;
    const el = audioRef.current;
    if (!el) return;
    el
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // Autoplay might be blocked; user can tap play manually.
      })
      .finally(() => setPendingAutoplay(false));
  }, [pendingAutoplay]);

  const getRuntimeDuration = () => {
    const el = audioRef.current;
    const metaDuration = el && Number.isFinite(el.duration) ? el.duration : undefined;
    if (metaDuration && metaDuration > 0) return metaDuration;
    if (duration && duration > 0) return duration;
    if (activeTrack?.durationSeconds && activeTrack.durationSeconds > 0) return activeTrack.durationSeconds;
    return Math.max(currentTime, 1);
  };

  const persistProgress = () => {
    const el = audioRef.current;
    if (!el || !activeTrack) return;
    const nextTime = el.currentTime;
    setCurrentTime(nextTime);
    const playbackDuration = getRuntimeDuration();
    saveProgress(activeTrack.sermonId, nextTime, playbackDuration);
  };

  const playTrack = (track: Track) => {
    setActiveTrack(track);
    setHasAppliedResume(false);
    setPendingAutoplay(true);
    setDuration(track.durationSeconds ?? 0);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (next: number) => {
    const el = audioRef.current;
    if (!el || !activeTrack) return;
    const cappedDuration = getRuntimeDuration();
    const safeTime = Math.min(Math.max(next, 0), cappedDuration);
    el.currentTime = safeTime;
    setCurrentTime(safeTime);
    saveProgress(activeTrack.sermonId, safeTime, cappedDuration);
  };

  const skipBy = (seconds: number) => {
    const el = audioRef.current;
    const base = el ? el.currentTime : currentTime;
    handleSeek(base + seconds);
  };

  const toggleMute = () => {
    const el = audioRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (el) {
      el.muted = nextMuted;
    }
  };

  const close = () => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    if (activeTrack) {
      clearProgress(activeTrack.sermonId);
    }
    setActiveTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasAppliedResume(false);
  };

  const contextValue: GlobalAudioContextValue = {
    activeTrack,
    isPlaying,
    isMuted,
    currentTime,
    duration,
    playTrack,
    togglePlay,
    seekTo: handleSeek,
    skipBy,
    toggleMute,
    close,
  };

  return (
    <GlobalAudioContext.Provider value={contextValue}>
      {children}
      {allowed && activeTrack ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(720px,90vw)] -translate-x-1/2">
          <MiniPodcastPlayer
            title={activeTrack.title}
            isPlaying={isPlaying}
            isMuted={isMuted}
            onTogglePlay={togglePlay}
            onSkipBack={() => skipBy(-10)}
            onSkipForward={() => skipBy(10)}
            onToggleMute={toggleMute}
            onClose={close}
          />
        </div>
      ) : null}
      <audio
        ref={audioRef}
        className="sr-only"
        src={activeTrack?.audioUrl}
        preload="metadata"
        muted={isMuted}
        onTimeUpdate={persistProgress}
        onPause={() => {
          setIsPlaying(false);
          persistProgress();
        }}
        onSeeked={persistProgress}
        onPlay={() => setIsPlaying(true)}
        onLoadedData={() => setDuration(audioRef.current?.duration || activeTrack?.durationSeconds || duration)}
        onDurationChange={() => setDuration(audioRef.current?.duration || activeTrack?.durationSeconds || duration)}
        onEnded={() => {
          setIsPlaying(false);
          if (activeTrack) {
            clearProgress(activeTrack.sermonId);
          }
        }}
      />
    </GlobalAudioContext.Provider>
  );
}
