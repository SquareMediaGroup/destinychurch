"use client";

import Link from "next/link";
import { useSettings } from "@/lib/settings";

type SermonDebugPanelProps = {
  viewId: string;
  viewIdRaw: string;
  debugMode: boolean;
  matchedField: string | null;
  tryIds: string[];
  resolvedSermonId: string;
  resolvedSermonTitle: string;
};

export default function SermonDebugPanel({
  viewId,
  viewIdRaw,
  debugMode,
  matchedField,
  tryIds,
  resolvedSermonId,
  resolvedSermonTitle,
}: SermonDebugPanelProps) {
  const { settings } = useSettings();

  if (!settings.devMode) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-black/5 bg-white px-4 py-3 text-xs font-semibold text-destiny-grey">
        <span>View ID: {viewId || "none"}</span>
        {viewId && (
          <Link
            href={`/sermons/view?viewId=${encodeURIComponent(viewId)}&debug=${debugMode ? "0" : "1"}`}
            className="rounded-full border border-destiny-orange px-3 py-1 text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
          >
            {debugMode ? "Exit debug" : "Enable debug"}
          </Link>
        )}
      </div>

      {debugMode && (
        <div className="space-y-1 rounded-xl border border-black/5 bg-white px-4 py-3 text-xs text-destiny-grey shadow-sm">
          <p className="font-semibold text-destiny-black">Debug info</p>
          <p>Raw viewId: {viewIdRaw || "n/a"}</p>
          <p>Decoded viewId: {viewId || "n/a"}</p>
          <p>Matched field: {matchedField || "none"}</p>
          <p>
            Resolved sermon: {resolvedSermonId} - {resolvedSermonTitle}
          </p>
          <p>Try order: {tryIds.join(", ") || "none"}</p>
        </div>
      )}
    </>
  );
}
