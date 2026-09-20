"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { YTVideo } from "@/lib/youtube";
import type { SpeakerOverrideRow } from "@/lib/speakerOverrides.server";
import { useAdminList } from "@/lib/useAdminList";
import { useToast } from "@/components/ToastProvider";
import { Badge, SearchInput, inputClass, ghostBtn, primaryBtn } from "@/components/admin/AdminUI";

// Manual speaker correction — the hand-edit counterpart to SpeakerReviewPanel's
// AI batch job. Both write speaker_overrides (app/api/admin/sermons/speaker/route.ts,
// lib/speakerReview.server.ts); this is the only place in the admin that lets
// someone type a name in directly. Title/description are never editable here —
// they keep following YouTube, same as everywhere else in the app.

export default function SpeakerEditor({
  videos,
  overrides,
}: {
  /** Full archive, speaker already corrected (read through lib/speakerOverrides.server.ts). */
  videos: YTVideo[];
  /** Raw override rows, keyed by video id — tells a manual edit apart from an AI one, and whether Revert has anything to do. */
  overrides: Record<string, SpeakerOverrideRow>;
}) {
  const [localOverrides, setLocalOverrides] = useState(overrides);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  const { visible, search, setSearch, total, shown } = useAdminList({
    items: videos,
    searchKeys: ["title", "speaker"],
    syncUrl: false,
  });

  async function save(video: YTVideo) {
    const value = (edits[video.id] ?? video.speaker ?? "").trim();
    setBusyId(video.id);
    try {
      const res = await fetch("/api/admin/sermons/speaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: video.id, speaker: value || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the speaker");

      setLocalOverrides((prev) => ({
        ...prev,
        [video.id]: { speaker: value || null, reviewedBy: "admin" },
      }));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[video.id];
        return next;
      });
      toast.success(`Speaker updated for “${video.title}”`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the speaker");
    } finally {
      setBusyId(null);
    }
  }

  async function revert(video: YTVideo) {
    setBusyId(video.id);
    try {
      const res = await fetch("/api/admin/sermons/speaker", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: video.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not revert the speaker");

      setLocalOverrides((prev) => {
        const next = { ...prev };
        delete next[video.id];
        return next;
      });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[video.id];
        return next;
      });
      toast.success(`Reverted to YouTube's parsed speaker for “${video.title}”`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revert the speaker");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-destiny-grey dark:text-white">Manual speaker edit</h2>
        <p className="mt-1 text-xs text-destiny-grey/55 dark:text-white/55">
          Search the archive and correct a sermon&apos;s speaker by hand. Title and description
          aren&apos;t editable here — they always follow YouTube.
        </p>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search sermons by title or speaker" />
        <p className="shrink-0 text-xs font-bold tabular-nums text-destiny-grey/40 dark:text-white/40">
          {shown === total ? `${total}` : `${shown} of ${total}`} sermons
        </p>
      </div>

      <div className="max-h-[28rem] overflow-y-auto rounded-2xl border border-black/5 dark:border-white/8">
        {visible.length === 0 && (
          <p className="p-5 text-sm text-destiny-grey/50 dark:text-white/50">No sermons match.</p>
        )}
        <div className="divide-y divide-black/5 dark:divide-white/8">
          {visible.map((video) => {
            const override = localOverrides[video.id];
            const draft = edits[video.id] ?? video.speaker ?? "";
            const busy = busyId === video.id;
            return (
              <div key={video.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-destiny-grey dark:text-white">
                    {video.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {override ? (
                      <Badge tone={override.reviewedBy === "admin" ? "blue" : "purple"}>
                        {override.reviewedBy === "admin" ? "Manually set" : "AI set"}
                      </Badge>
                    ) : (
                      <Badge tone="grey">Unreviewed</Badge>
                    )}
                  </div>
                </div>
                <input
                  value={draft}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [video.id]: e.target.value }))}
                  placeholder="No speaker"
                  className={`${inputClass} w-48`}
                />
                <button
                  type="button"
                  onClick={() => save(video)}
                  disabled={busy}
                  className={`${primaryBtn} px-3 py-2 text-xs`}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => revert(video)}
                  disabled={busy || !override}
                  title="Revert to YouTube's parsed speaker"
                  className={`${ghostBtn} px-3 py-2 text-xs`}
                >
                  Revert
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
