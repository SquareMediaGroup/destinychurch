"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";

/**
 * A point in the video where playback stops and the viewer picks what happens
 * next. An option with `seekTo` jumps there and plays on; one without simply
 * resumes from the checkpoint.
 */
export interface VideoCheckpoint {
  /** Seconds into the video. */
  at: number;
  /** Optional line shown above the choices. */
  title?: string;
  options: { label: string; seekTo?: number }[];
}

/** iOS Safari only fullscreens the <video> itself, through these. */
type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

const SEEK_STEP = 5;
const HIDE_CONTROLS_AFTER_MS = 2500;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * A video with the site's own controls instead of the browser's, plus optional
 * checkpoints that pause playback and ask the viewer to choose a path.
 *
 * Checkpoints are watched on every animation frame while playing rather than
 * on `timeupdate`, which only fires every ~250ms and would overshoot the mark
 * by up to a quarter of a second. A checkpoint fires only when playback runs
 * *through* it — scrubbing past one does not stop the video, and seeking back
 * before it re-arms it.
 *
 * Unlike BackgroundVideo this is content, not decoration: it never autoplays,
 * so there is no reduced-motion path to take — nothing moves until the viewer
 * presses play.
 */
export default function VideoPlayer({
  src,
  poster,
  label,
  checkpoints = [],
  className,
}: {
  src: string;
  poster?: string;
  /** Accessible name for the player region. */
  label: string;
  checkpoints?: VideoCheckpoint[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<WebkitVideo>(null);
  const lastTimeRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [activeCheckpoint, setActiveCheckpoint] = useState<VideoCheckpoint | null>(null);

  // The server-rendered <video> can load its metadata before hydration attaches
  // onLoadedMetadata, in which case that event has already gone by. Read it
  // straight off the element once mounted (an external system, so syncing
  // from it here is what effects are for).
  useEffect(() => {
    const video = videoRef.current;
    if (video && video.readyState >= 1) setDuration(video.duration);
  }, []);

  // --- Checkpoint watcher -------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing || checkpoints.length === 0) return;

    let frame = 0;
    const tick = () => {
      const t = video.currentTime;
      const prev = lastTimeRef.current;
      const hit = checkpoints.find((c) => prev < c.at && t >= c.at);
      lastTimeRef.current = t;

      if (hit) {
        video.pause();
        video.currentTime = hit.at;
        lastTimeRef.current = hit.at;
        // In iOS native fullscreen our overlay is invisible, so come back out
        // to the page where the choice can actually be made.
        if (video.webkitDisplayingFullscreen) video.webkitExitFullscreen?.();
        setActiveCheckpoint(hit);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, checkpoints]);

  // --- Controls visibility ------------------------------------------------
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, HIDE_CONTROLS_AFTER_MS);
  }, []);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  // --- Fullscreen ---------------------------------------------------------
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (container.requestFullscreen) {
      // Fullscreen the wrapper, not the <video>, so the custom controls and
      // checkpoint overlay come along.
      void container.requestFullscreen();
    } else {
      video.webkitEnterFullscreen?.();
    }
  }, []);

  // --- Playback -----------------------------------------------------------
  const play = useCallback(() => {
    setActiveCheckpoint(null);
    void videoRef.current?.play();
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) play();
    else video.pause();
  }, [play]);

  /** A deliberate jump: never trips a checkpoint between here and there. */
  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(time, video.duration || time));
    video.currentTime = clamped;
    lastTimeRef.current = clamped;
    setCurrent(clamped);
  }, []);

  const choose = useCallback(
    (option: VideoCheckpoint["options"][number]) => {
      if (option.seekTo !== undefined) seek(option.seekTo);
      play();
    },
    [seek, play],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Leave keys alone while a choice is on screen, and inside the scrubber,
    // which handles its own arrows.
    if (activeCheckpoint) return;
    const onSlider = (e.target as HTMLElement).getAttribute("type") === "range";
    switch (e.key) {
      case " ":
      case "k":
        if ((e.target as HTMLElement).tagName === "BUTTON") return;
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        if (onSlider) return;
        e.preventDefault();
        seek(current - SEEK_STEP);
        break;
      case "ArrowRight":
        if (onSlider) return;
        e.preventDefault();
        seek(current + SEEK_STEP);
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
    }
    revealControls();
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const showControls = controlsVisible && !activeCheckpoint;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerMove={revealControls}
      className={cn(
        "group relative overflow-hidden bg-black",
        fullscreen && "flex items-center",
        playing && !controlsVisible && "cursor-none",
        className,
      )}
    >
      <video
        ref={videoRef}
        // The #t fragment makes iOS paint the first frame instead of black
        // when there is no poster. Fragments never reach the server, so the
        // signed URL is unaffected.
        src={poster ? src : `${src}#t=0.001`}
        poster={poster}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          revealControls();
        }}
        // Paused, the controls stay put; the hide timer checks `paused` too.
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        className="h-full w-full object-cover"
      />

      {/* Big centred play button before the first play. */}
      {!started && (
        <button
          type="button"
          onClick={play}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition hover:bg-black/35 focus-visible:outline-none"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-destiny-orange text-white shadow-xl shadow-black/30 transition group-hover:scale-105 group-focus-within:ring-4 group-focus-within:ring-white/70">
            {/* Bigger than Icon's largest size, and cn() would not resolve a
                text-size override, so the glyph is styled directly. */}
            <span
              aria-hidden="true"
              translate="no"
              className="material-symbols-rounded text-5xl"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              play_arrow
            </span>
          </span>
        </button>
      )}

      {/* Checkpoint choice. */}
      {activeCheckpoint && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={activeCheckpoint.title ?? "Choose how to continue"}
          className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/55 p-6 text-center backdrop-blur-sm"
        >
          {activeCheckpoint.title && (
            <p className="max-w-md text-lg font-black text-white sm:text-xl">
              {activeCheckpoint.title}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            {activeCheckpoint.options.map((option, i) => (
              <Button
                key={option.label}
                // Land keyboard and screen-reader users on the choices.
                autoFocus={i === 0}
                variant={i === 0 ? "primary" : "glass"}
                size="lg"
                onClick={() => choose(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Control bar. */}
      {started && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pb-2 pt-10 transition-opacity duration-300 sm:px-4 sm:pb-3",
            showControls ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onFocus={revealControls}
        >
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
            className="video-scrubber block h-4 w-full cursor-pointer appearance-none bg-transparent"
            style={{ ["--progress" as string]: `${progress}%` }}
          />
          <div className="mt-1 flex items-center gap-1 text-white">
            <ControlButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
              <Icon name={playing ? "pause" : "play_arrow"} filled size="2xl" />
            </ControlButton>
            <ControlButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
              <Icon name={muted ? "volume_off" : "volume_up"} filled size="xl" />
            </ControlButton>
            <span className="ml-1 text-xs font-bold tabular-nums text-white/85 sm:text-sm">
              {formatTime(current)} / {formatTime(duration)}
            </span>
            <ControlButton
              label={fullscreen ? "Exit full screen" : "Full screen"}
              onClick={toggleFullscreen}
              className="ml-auto"
            >
              <Icon name={fullscreen ? "fullscreen_exit" : "fullscreen"} size="xl" />
            </ControlButton>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        className,
      )}
    >
      {children}
    </button>
  );
}
