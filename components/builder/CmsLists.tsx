"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Sermon = {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt?: string;
  url?: string;
};

type EventRow = {
  id: number;
  type: string;
  start_date: string;
  signup_url?: string;
  format?: string;
  location?: string;
  meeting_platform?: string;
};

export function SermonsList({ limit = 3 }: { limit?: number }) {
  const [items, setItems] = useState<Sermon[] | null>(null);

  useEffect(() => {
    fetch("/api/youtube/videos")
      .then((r) => r.json())
      .then((d: unknown[]) => {
        const list = (Array.isArray(d) ? d : []).slice(0, limit).map((v) => {
          const o = v as Record<string, unknown>;
          return {
            id: String(o.id ?? o.videoId ?? ""),
            title: String(o.title ?? ""),
            thumbnail: String(o.thumbnail ?? o.thumbnailUrl ?? ""),
            publishedAt: o.publishedAt as string | undefined,
            url: o.url as string | undefined,
          };
        });
        setItems(list);
      })
      .catch(() => setItems([]));
  }, [limit]);

  if (items === null) return <CmsSkeleton lines={limit} label="Loading sermons…" />;
  if (items.length === 0)
    return <CmsEmpty label="No sermons found" icon="play_circle" />;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => (
        <a
          key={s.id}
          href={s.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-3"
        >
          <div className="relative aspect-video overflow-hidden rounded-xl bg-[#f5f7fa]">
            {s.thumbnail ? (
              <Image
                src={s.thumbnail}
                alt={s.title}
                fill
                unoptimized
                className="object-cover transition group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-destiny-grey/30">
                <span className="material-symbols-rounded text-4xl">play_circle</span>
              </div>
            )}
          </div>
          <p className="line-clamp-2 text-sm font-bold text-destiny-grey transition group-hover:text-destiny-orange">
            {s.title}
          </p>
        </a>
      ))}
    </div>
  );
}

export function EventsList({ limit = 3, type }: { limit?: number; type?: string }) {
  const [items, setItems] = useState<EventRow[] | null>(null);

  useEffect(() => {
    fetch("/api/alpha-events")
      .then((r) => r.json())
      .then((d: unknown) => {
        const arr = Array.isArray(d) ? (d as EventRow[]) : [];
        const filtered = type ? arr.filter((e) => e.type === type) : arr;
        setItems(filtered.slice(0, limit));
      })
      .catch(() => setItems([]));
  }, [limit, type]);

  if (items === null) return <CmsSkeleton lines={limit} label="Loading events…" />;
  if (items.length === 0)
    return <CmsEmpty label="No upcoming events" icon="event" />;

  return (
    <div className="flex flex-col gap-3">
      {items.map((ev) => {
        const date = new Date(ev.start_date);
        const dateStr = date.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        return (
          <div
            key={ev.id}
            className="flex items-center justify-between rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-destiny-orange/10 text-destiny-orange">
                <span className="material-symbols-rounded">event</span>
              </div>
              <div>
                <p className="text-sm font-bold text-destiny-grey capitalize">
                  {ev.type.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-destiny-grey/60">
                  {dateStr} · {ev.location || ev.format || "TBA"}
                </p>
              </div>
            </div>
            {ev.signup_url && (
              <a
                href={ev.signup_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-destiny-orange px-3 py-1.5 text-xs font-bold text-white hover:brightness-110"
              >
                Sign up
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CmsSkeleton({ lines, label }: { lines: number; label: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-wide text-destiny-grey/40">{label}</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-[#f5f7fa]" />
        ))}
      </div>
    </div>
  );
}

function CmsEmpty({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/10 py-10 text-destiny-grey/40">
      <span className="material-symbols-rounded text-3xl">{icon}</span>
      <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
    </div>
  );
}
