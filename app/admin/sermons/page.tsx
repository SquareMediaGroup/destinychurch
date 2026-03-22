"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  duration?: string;
}

interface HiddenEntry {
  video_id: string;
}

export default function AdminSermonsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hiding, setHiding] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ytRes, hiddenRes] = await Promise.all([
        fetch("/api/youtube/videos"),
        fetch("/api/admin/sermons"),
      ]);
      const ytData = ytRes.ok ? await ytRes.json() : [];
      const hiddenData: HiddenEntry[] = hiddenRes.ok ? await hiddenRes.json() : [];
      setVideos(Array.isArray(ytData) ? ytData : []);
      setHiddenIds(new Set(hiddenData.map((h) => h.video_id)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleHide(id: string) {
    setHiding(id);
    setConfirmId(null);
    await fetch(`/api/admin/sermons/${id}`, { method: "POST" });
    setHiddenIds((prev) => new Set([...prev, id]));
    setHiding(null);
  }

  const visible = videos.filter((v) => !hiddenIds.has(v.id));

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-destiny-grey">Sermons</h1>
        <p className="mt-1 text-sm text-destiny-grey/50">
          Hide videos from the public sermons section. This cannot be undone.
        </p>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-black/5 px-6 py-4">
          <p className="text-sm font-bold text-destiny-grey">
            {loading ? "Loading…" : `${visible.length} visible video${visible.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
              progress_activity
            </span>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-rounded mb-3 text-4xl text-destiny-grey/20">
              video_library
            </span>
            <p className="text-sm font-bold text-destiny-grey/40">No visible videos</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {visible.map((v) => (
              <div key={v.id} className="flex items-center gap-4 px-6 py-4">
                {/* Thumbnail */}
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-black/5">
                  <Image
                    src={v.thumbnail}
                    alt={v.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-destiny-grey">{v.title}</p>
                  {v.duration && (
                    <p className="text-xs text-destiny-grey/40">{v.duration}</p>
                  )}
                </div>

                {/* Hide action */}
                <div className="shrink-0">
                  {confirmId === v.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-destiny-grey/50">Are you sure? This is permanent.</span>
                      <button
                        onClick={() => handleHide(v.id)}
                        disabled={hiding === v.id}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                      >
                        {hiding === v.id ? "Hiding…" : "Yes, hide"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-destiny-grey/40 transition hover:bg-black/5"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(v.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/30 transition hover:bg-red-50 hover:text-red-500"
                      title="Hide video"
                    >
                      <span className="material-symbols-rounded text-base">visibility_off</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
