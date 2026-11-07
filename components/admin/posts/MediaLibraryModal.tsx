"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/admin/AdminUI";
import { API } from "@/lib/posts";

interface MediaItem {
  name: string;
  url: string;
  created_at: string | null;
}

/**
 * Images already uploaded for Posts, newest first, so the same photo can be
 * used again instead of uploaded again. Picking one hands its URL back; the
 * caller decides what to do with it (set a field, insert into the body).
 */
export function MediaLibraryModal({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Which page to fetch; bumped by "Show more".
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/media?offset=${offset}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !Array.isArray(data.items)) {
          setError(data.error || "Couldn't load the library.");
          return;
        }
        setItems((prev) => (offset === 0 ? data.items : [...prev, ...data.items]));
        setNextOffset(data.nextOffset ?? null);
      } catch {
        if (!cancelled) setError("Couldn't load the library.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [offset]);

  return (
    <Modal title="Image library" size="lg" onClose={onClose}>
      <p className="mb-3 text-xs text-destiny-grey/55 dark:text-white/55">
        Images uploaded for pages, newest first. Pick one to use it again.
      </p>
      {error && <p className="mb-3 text-xs font-medium text-destiny-red">{error}</p>}
      {!loading && !error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-destiny-grey/45 dark:text-white/45">
          Nothing uploaded yet. Images you upload to a page show up here.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => onPick(item.url)}
              title={item.created_at ? `Uploaded ${new Date(item.created_at).toLocaleDateString()}` : undefined}
              className="group aspect-square overflow-hidden rounded-lg border border-black/10 bg-[#f5f7fa] transition hover:ring-2 hover:ring-destiny-orange focus-visible:ring-2 focus-visible:ring-destiny-orange dark:border-white/10 dark:bg-white/5"
            >
              {/* Plain <img>: storage URLs with no known dimensions. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {loading && <p className="mt-3 text-center text-xs text-destiny-grey/40 dark:text-white/40">Loading…</p>}
      {!loading && nextOffset !== null && nextOffset > 0 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setOffset(nextOffset)}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
          >
            Show more
          </button>
        </div>
      )}
    </Modal>
  );
}
