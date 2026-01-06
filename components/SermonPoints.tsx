"use client";

import { useMemo, useState } from "react";
import type { SummaryPoint } from "@/lib/types";
import { useGlobalAudio } from "./GlobalAudioProvider";

type SermonPointsProps = {
  points?: SummaryPoint[];
  sermonId?: string;
  sermonTitle?: string;
  audioUrl?: string;
  onJump?: (seconds: number) => void;
};

const gradients = [
  "from-destiny-orange/25 via-[var(--surface)] to-destiny-orange/10",
  "from-destiny-blue/25 via-[var(--surface)] to-destiny-blue/10",
  "from-destiny-green/25 via-[var(--surface)] to-destiny-green/10",
  "from-destiny-purple/25 via-[var(--surface)] to-destiny-purple/10",
  "from-destiny-red/25 via-[var(--surface)] to-destiny-red/10",
];

const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function SermonPoints({
  points,
  sermonId,
  sermonTitle,
  audioUrl,
  onJump,
}: SermonPointsProps) {
  const sorted = useMemo(
    () => (points || []).slice().sort((a, b) => a.order_index - b.order_index),
    [points],
  );

  const globalAudio = useGlobalAudio();
  const [openId, setOpenId] = useState<string | null>(sorted[0]?.id ?? null);

  if (!sorted.length) return null;

  const handleJump = (seconds: number) => {
    if (onJump) {
      onJump(seconds);
      return;
    }
    if (globalAudio && sermonId && sermonTitle && audioUrl) {
      const isActive = globalAudio.activeTrack?.sermonId === sermonId;
      if (!isActive) {
        globalAudio.playTrack({ sermonId, title: sermonTitle, audioUrl });
      }
      globalAudio.seekTo(seconds);
      if (globalAudio.isMuted) {
        globalAudio.toggleMute();
      }
      if (!globalAudio.isPlaying) {
        globalAudio.togglePlay();
      }
      return;
    }
    const audio = document.querySelector("audio");
    if (audio) {
      try {
        audio.currentTime = seconds;
        audio.muted = false;
        if (audio.volume === 0) {
          audio.volume = 0.8;
        }
        audio.play?.();
        return;
      } catch (error) {
        console.warn("Unable to seek audio", error);
      }
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5 sm:py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-destiny-grey/70">
            Sermon points
          </p>
          <p className="text-sm text-destiny-grey">Tap to expand; jump to the exact timestamp.</p>
        </div>
        <span className="rounded-full bg-destiny-blue/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-destiny-blue">
          {sorted.length} points
        </span>
      </div>

      <div className="space-y-3 border-t border-black/5 px-3 py-4 sm:px-5">
        <div className="flex items-start gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:items-start sm:gap-4 sm:overflow-visible">
          {sorted.map((point, idx) => {
            const active = openId === point.id;
            return (
              <button
                key={point.id}
                type="button"
                onClick={() => setOpenId(active ? null : point.id)}
                className={`group relative w-[min(85vw,320px)] flex-shrink-0 snap-center rounded-2xl border border-black/5 bg-gradient-to-br ${gradients[idx % gradients.length]} p-4 text-left shadow-[0_14px_40px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 sm:min-w-0 sm:w-auto sm:self-start`}
              >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-black/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-destiny-grey">
                      P{idx + 1}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-destiny-orange/10 px-2.5 py-1 text-[11px] font-semibold text-destiny-orange">
                      {formatTime(point.start_seconds)}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-semibold leading-tight text-destiny-black">
                    {point.title}
                  </p>
                  <p
                    className={`mt-2 text-sm text-destiny-grey transition-all ${
                      active ? "line-clamp-none" : "line-clamp-2"
                    }`}
                  >
                    {point.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-destiny-orange">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-destiny-orange" />
                      {active ? "Hide details" : "View details"}
                    </span>
                  </div>

                <div
                  className={`flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl bg-[var(--surface-overlay)] px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition-[max-height,opacity,transform,margin] duration-300 ${
                    active
                      ? "mt-2 max-h-24 translate-y-0 opacity-100"
                      : "mt-0 max-h-0 -translate-y-1 opacity-0"
                  } ${active ? "pointer-events-auto" : "pointer-events-none"}`}
                >
                  <div className="text-xs text-destiny-grey">
                    Start at{" "}
                    <span className="font-semibold text-destiny-black">
                      {formatTime(point.start_seconds)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleJump(point.start_seconds);
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition hover:brightness-95"
                  >
                    Jump to point
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
