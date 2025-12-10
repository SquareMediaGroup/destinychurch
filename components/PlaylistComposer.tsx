"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Sermon } from "@/lib/types";

type PlaylistComposerProps = {
  sermons: Sermon[];
};

export default function PlaylistComposer({ sermons }: PlaylistComposerProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const move = (id: string, direction: "up" | "down") => {
    setSelected((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedPreview = selected
    .map((id) => sermons.find((s) => s.id === id)?.title || id)
    .filter(Boolean);

  return (
    <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
      <div className="space-y-2 rounded-xl border border-black/5 bg-[var(--surface-muted)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-destiny-grey/70">
            Pick sermons (click to add/remove)
          </p>
          <span className="text-[11px] font-semibold text-destiny-orange">
            {selected.length} selected
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {sermons.map((sermon) => {
            const isSelected = selectedSet.has(sermon.id);
            const index = selected.indexOf(sermon.id);
            return (
              <button
                type="button"
                key={sermon.id}
                onClick={() => toggle(sermon.id)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                  isSelected
                    ? "border-destiny-orange bg-destiny-orange/10"
                    : "border-black/5 bg-white hover:border-destiny-orange/40"
                }`}
              >
                <div className="relative h-12 w-20 overflow-hidden rounded-md bg-destiny-grey/10">
                  <Image
                    src={sermon.thumbnailUrl}
                    alt={sermon.title}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[var(--foreground)] line-clamp-2">
                    {sermon.title}
                  </p>
                  <p className="text-[11px] text-destiny-grey/80">
                    {sermon.youtubeVideoId ? `YouTube: ${sermon.youtubeVideoId}` : "No video ID"}
                  </p>
                </div>
                {isSelected && (
                  <span className="rounded-full bg-destiny-orange px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    #{index + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-black/5 bg-[var(--surface)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-destiny-grey/70">
            Order
          </p>
          <span className="text-[11px] text-destiny-grey">
            Drag-free: use arrows
          </span>
        </div>
        {selected.length === 0 ? (
          <p className="text-sm text-destiny-grey">No sermons selected yet.</p>
        ) : (
          <div className="space-y-2">
            {selected.map((id, idx) => {
              const sermon = sermons.find((s) => s.id === id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-black/5 bg-[var(--surface-muted)] px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-destiny-orange">
                      #{idx + 1}
                    </span>
                    <p className="line-clamp-1">{sermon?.title || id}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(id, "up")}
                      disabled={idx === 0}
                      className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(id, "down")}
                      disabled={idx === selected.length - 1}
                      className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <input type="hidden" name="sermonOrder" value={selected.join("\n")} />
        {selectedPreview.length > 0 && (
          <p className="text-[11px] text-destiny-grey/80">
            Preview: {selectedPreview.join(" → ")}
          </p>
        )}
      </div>
    </div>
  );
}
