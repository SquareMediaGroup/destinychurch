"use client";

import { useState, useRef } from "react";
import SermonPlayer, { type SermonPlayerHandle } from "./SermonPlayer";

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface SermonPlayerSectionProps {
  videoId: string;
  thumbnail?: string;
  sermonStart?: number | null;
  title: string;
  meta: string;
}

export default function SermonPlayerSection({ videoId, thumbnail, sermonStart, title, meta }: SermonPlayerSectionProps) {
  const [showJump, setShowJump] = useState(!!sermonStart);
  const handleRef = useRef<SermonPlayerHandle | null>(null);

  return (
    <>
      <SermonPlayer
        videoId={videoId}
        thumbnail={thumbnail}
        sermonStart={sermonStart}
        onSermonReached={() => setShowJump(false)}
        handleRef={handleRef}
      />

      {/* Title row */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="text-xl font-black text-white leading-snug">{title}</h1>
        {sermonStart && showJump && (
          <button
            onClick={() => handleRef.current?.jump()}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-destiny-orange px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
            </svg>
            Skip to Sermon ({formatTimestamp(sermonStart)})
          </button>
        )}
      </div>

      {/* Meta row */}
      <p className="mb-4 mt-1 text-sm text-white/50">{meta}</p>
    </>
  );
}
