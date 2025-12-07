"use client";

import Image from "next/image";
import Link from "next/link";
import { useContinueWatching } from "@/lib/continueWatching";
import { Sermon } from "@/lib/types";

type ContinueWatchingRowProps = {
  sermons: Sermon[];
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function ContinueWatchingRow({
  sermons,
}: ContinueWatchingRowProps) {
  const { items } = useContinueWatching();

  const entries = items
    .map((entry) => ({
      entry,
      sermon: sermons.find((s) => s.id === entry.sermonId),
    }))
    .filter(
      (row): row is { entry: (typeof items)[number]; sermon: Sermon } =>
        Boolean(row.sermon),
    );

  if (!entries.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-destiny-black">
          Continue watching
        </h3>
        <p className="text-sm text-destiny-grey/70">Local to this device</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {entries.map(({ entry, sermon }) => {
          const percent =
            sermon.durationSeconds && sermon.durationSeconds > 0
              ? Math.min(
                  100,
                  Math.round((entry.lastPosition / sermon.durationSeconds) * 100),
                )
              : undefined;

          return (
            <Link
              key={entry.sermonId}
              href={`/sermons/${encodeURIComponent(entry.sermonId)}`}
              className="min-w-[260px] max-w-[280px] flex-1 rounded-xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-video overflow-hidden rounded-t-xl bg-destiny-grey/5">
                <Image
                  src={sermon.thumbnailUrl}
                  alt={sermon.title}
                  fill
                  sizes="280px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                <span className="absolute right-2 top-2 rounded-md bg-black/75 px-2 py-1 text-[11px] font-semibold text-white">
                  Resume {formatTime(entry.lastPosition)}
                </span>
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/40">
                  <div
                    className="h-full bg-destiny-orange"
                    style={{ width: percent ? `${percent}%` : "30%" }}
                  />
                </div>
              </div>
              <div className="space-y-1 px-3.5 py-3">
                <p className="text-sm font-semibold text-destiny-black line-clamp-2">
                  {sermon.title}
                </p>
                <p className="text-xs font-medium uppercase tracking-wide text-destiny-orange">
                  {sermon.speaker || "Destiny Church"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
