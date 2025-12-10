"use client";

import Icon from "./Icon";

const ACCENT_ORANGE = "#F58021";

type MiniPodcastPlayerProps = {
  title: string;
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
      className="relative flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(238,238,245,0.66))] px-3 py-2 text-black shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(8,8,10,0.9),rgba(2,2,4,0.82))] dark:text-white"
      style={{ ["--accent-orange"]: ACCENT_ORANGE }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-b from-[#f8962e] via-[#f58021] to-[#e56a11] text-white shadow-[0_10px_22px_rgba(245,128,33,0.38)] transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[rgba(245,128,33,0.45)]"
          aria-label={isPlaying ? "Pause podcast" : "Play podcast"}
        >
          <Icon name={isPlaying ? "pause" : "play_arrow"} size={26} />
        </button>

        <div className="relative flex-1 min-w-[160px] max-w-[360px] overflow-hidden sm:max-w-[520px]">
          <div className="whitespace-nowrap text-sm font-semibold text-black dark:text-white">
            <span className="marquee">{title}</span>
            <span className="marquee" aria-hidden>
              {title}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <IconButton icon="replay_10" label="Back 10 seconds" onClick={onSkipBack} />
        <IconButton icon="forward_10" label="Ahead 10 seconds" onClick={onSkipForward} />
        <IconButton icon={isMuted ? "volume_off" : "volume_up"} label={isMuted ? "Unmute" : "Mute"} onClick={onToggleMute} />
        <IconButton icon="close" label="Close player" onClick={onClose} />
      </div>

      <style jsx>{`
        .marquee {
          display: inline-block;
          padding-right: 28px;
          animation: marquee 14s linear infinite;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-black/5 text-black shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-black/25 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-[rgba(245,128,33,0.35)] dark:border-white/8 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:hover:bg-white/10 dark:focus:ring-white/50"
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
