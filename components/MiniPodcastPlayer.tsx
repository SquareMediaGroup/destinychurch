"use client";

import { type CSSProperties } from "react";
import Link from "next/link";
import Icon from "./Icon";

const ACCENT_ORANGE = "#F58021";

type MiniPodcastPlayerProps = {
  title: string;
  sermonId: string;
  isPlaying: boolean;
  isMuted: boolean;
  onTogglePlay: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onToggleMute: () => void;
  onClose: () => void;
};

export default function MiniPodcastPlayer({
  title,
  sermonId,
  isPlaying,
  isMuted,
  onTogglePlay,
  onSkipBack,
  onSkipForward,
  onToggleMute,
  onClose,
}: MiniPodcastPlayerProps) {
  return (
    <div
      className="relative flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] shadow-sm"
      style={{ "--accent-orange": ACCENT_ORANGE } as CSSProperties}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-destiny-orange text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange sm:h-11 sm:w-11"
          aria-label={isPlaying ? "Pause podcast" : "Play podcast"}
        >
          <Icon name={isPlaying ? "pause" : "play_arrow"} size={22} />
        </button>

        <div className="flex min-w-[140px] max-w-[340px] items-center gap-2 overflow-hidden sm:max-w-[460px]">
          <Link
            href={`/sermons/view?viewId=${encodeURIComponent(sermonId)}`}
            className="truncate text-sm font-semibold transition hover:text-destiny-orange"
          >
            {title}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <IconButton icon="replay_10" label="Back 10 seconds" onClick={onSkipBack} />
        <IconButton icon="forward_10" label="Ahead 10 seconds" onClick={onSkipForward} />
        <IconButton icon={isMuted ? "volume_off" : "volume_up"} label={isMuted ? "Unmute" : "Mute"} onClick={onToggleMute} />
        <IconButton icon="close" label="Close player" onClick={onClose} />
      </div>
    </div>
  );
}

type IconButtonProps = {
  icon: string;
  label: string;
  onClick: () => void;
};

function IconButton({ icon, label, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--foreground)] shadow-xs transition hover:border-destiny-orange hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
