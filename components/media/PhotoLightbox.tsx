"use client";

import { useEffect, useState } from "react";
import type { MediaPhoto } from "@/lib/media.server";

export default function PhotoLightbox({ photos }: { photos: MediaPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : Math.min(i + 1, photos.length - 1)));
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? i : Math.max(i - 1, 0)));
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, photos.length]);

  if (photos.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-destiny-grey/50">
        Nothing on this board yet — be the first to add something.
      </p>
    );
  }

  const open = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 @xl:grid-cols-3">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative aspect-square overflow-hidden rounded-xl bg-destiny-grey/10"
          >
            {photo.isVideo ? (
              <video
                src={photo.url}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover transition hover:scale-105"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition hover:scale-105"
              />
            )}
            {photo.isVideo && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="material-symbols-rounded text-3xl text-white drop-shadow">
                  play_circle
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
          {open.isVideo ? (
            <video
              src={open.url}
              controls
              autoPlay
              playsInline
              className="max-h-[85vh] max-w-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={open.url}
              alt=""
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
