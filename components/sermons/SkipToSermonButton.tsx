"use client";

import { useSermonJump } from "./SermonJumpContext";

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SkipToSermonButton() {
  const { jumpFnRef, showJump, sermonStart } = useSermonJump();

  if (!sermonStart || !showJump) return null;

  return (
    <button
      onClick={() => jumpFnRef.current?.()}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-destiny-orange px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
    >
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
      </svg>
      Skip to Sermon ({formatTimestamp(sermonStart)})
    </button>
  );
}
