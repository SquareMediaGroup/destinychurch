"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import SermonSummary from "./SermonSummary";
import { PlaylistItem } from "@/lib/types";
import { useSettings } from "@/lib/settings";

type PlaylistViewerProps = {
  playlistTitle: string;
  items: PlaylistItem[];
  label?: string;
};

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));

export default function PlaylistViewer({ playlistTitle, items, label = "Playlist" }: PlaylistViewerProps) {
  const { settings } = useSettings();
  const [activeIndex, setActiveIndex] = useState(0);

  const activeItem = items[activeIndex];
  const remaining = useMemo(
    () => items.slice(activeIndex + 1),
    [items, activeIndex],
  );

  const youtubeQueue = useMemo(() => {
    const currentId = activeItem?.sermon.youtubeVideoId;
    const rest = remaining
      .map((item) => item.sermon.youtubeVideoId)
      .filter(Boolean) as string[];
    return currentId ? [currentId, ...rest] : rest;
  }, [activeItem, remaining]);

  if (!activeItem) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-6 text-sm text-destiny-grey">
        Add at least one sermon to start this playlist.
      </div>
    );
  }

  const hasNext = activeIndex < items.length - 1;
  const hasPrev = activeIndex > 0;

  const handleNext = () => {
    if (hasNext) setActiveIndex((index) => Math.min(index + 1, items.length - 1));
  };

  const handlePrev = () => {
    if (hasPrev) setActiveIndex((index) => Math.max(index - 1, 0));
  };

  useEffect(() => {
    if (!activeItem) return;
    const title = `${activeItem.sermon.title} | Destiny Sermons`;
    document.title = title;
  }, [activeItem]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <VideoPlayer
          key={activeItem.sermon.id}
          sermonId={activeItem.sermon.id}
          title={activeItem.sermon.title}
          videoUrl={activeItem.sermon.videoUrl}
          poster={activeItem.sermon.thumbnailUrl}
          durationSeconds={activeItem.sermon.durationSeconds}
          youtubeVideoId={activeItem.sermon.youtubeVideoId}
          autoPlay={settings.autoplayNext && activeIndex > 0}
          playlistIds={settings.autoplayNext ? youtubeQueue : undefined}
          onEnded={settings.autoplayNext ? handleNext : undefined}
        />
        <SermonSummary
          summary={activeItem.sermon.summary}
          sermonId={activeItem.sermon.id}
          sermonTitle={activeItem.sermon.title}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-destiny-orange">
              {label}
            </p>
            <p className="text-lg font-semibold text-[var(--foreground)]">
              {playlistTitle}
            </p>
            <p className="text-sm text-destiny-grey">
              Now playing {activeIndex + 1} of {items.length}: {activeItem.sermon.title}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext}
              className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-destiny-grey/80">
            Up next
          </h3>
          <span className="rounded-full bg-destiny-blue/10 px-3 py-1 text-[11px] font-semibold text-destiny-blue">
            {items.length} sermons
          </span>
        </div>
        <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
          {items.map((item, index) => {
            const sermon = item.sermon;
            const active = index === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${active ? "bg-destiny-blue/10" : "hover:bg-[var(--surface-muted)]"}`}
              >
                <div className="relative h-16 w-28 overflow-hidden rounded-lg bg-destiny-grey/10">
                  <Image
                    src={sermon.thumbnailUrl}
                    alt={sermon.title}
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                  <span className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                    #{index + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--foreground)] line-clamp-2">
                    {sermon.title}
                  </p>
                  <p className="text-xs text-destiny-grey">
                    {formatDate(sermon.date)}
                  </p>
                </div>
                {active && (
                  <span className="rounded-full bg-destiny-orange/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-destiny-orange">
                    Now
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
