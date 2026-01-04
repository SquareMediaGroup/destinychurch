"use client";

import { useSettings } from "@/lib/settings";

type SermonDevDetailsProps = {
  viewId: string;
  viewIdSource: string;
  sermonId: string;
  youtubeVideoId?: string;
  podcastGuid?: string;
  summaryLength: number;
  transcriptLength: number;
  tagCount: number;
};

export default function SermonDevDetails({
  viewId,
  viewIdSource,
  sermonId,
  youtubeVideoId,
  podcastGuid,
  summaryLength,
  transcriptLength,
  tagCount,
}: SermonDevDetailsProps) {
  const { settings } = useSettings();

  if (!settings.devMode) return null;

  return (
    <div className="mt-2 rounded-lg border border-destiny-blue/15 bg-destiny-blue/5 px-3 py-2 text-[11px] text-destiny-grey">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-destiny-blue">
        DevMode - Stats for nerds
      </p>
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-[10px] uppercase tracking-[0.16em] text-destiny-grey/70">
            View ID debug
          </span>
          <span className="font-mono text-destiny-black">{viewId}</span>
          <span className="text-[10px] text-destiny-grey/60">
            ({viewIdSource})
          </span>
        </div>
        <dl className="grid gap-1">
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-destiny-grey/60">
              DB ID
            </dt>
            <dd className="font-mono text-destiny-black truncate">{sermonId}</dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-destiny-grey/60">
              YouTube
            </dt>
            <dd className="font-mono text-destiny-black truncate">
              {youtubeVideoId || "n/a"}
            </dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-destiny-grey/60">
              Podcast
            </dt>
            <dd className="font-mono text-destiny-black truncate">
              {podcastGuid || "n/a"}
            </dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-destiny-grey/60">
              Summary chars
            </dt>
            <dd className="text-destiny-black">
              {summaryLength ? summaryLength.toLocaleString() : "n/a"}
            </dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-destiny-grey/60">
              Transcript chars
            </dt>
            <dd className="text-destiny-black">
              {transcriptLength ? transcriptLength.toLocaleString() : "n/a"}
            </dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-destiny-grey/60">
              Tags
            </dt>
            <dd className="text-destiny-black">
              {tagCount ? tagCount.toLocaleString() : "n/a"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
