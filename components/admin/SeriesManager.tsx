"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import { Badge, inputClass, primaryBtn, dangerBtn } from "@/components/admin/AdminUI";

export interface SeriesManagerRow {
  playlistId: string;
  title: string | null;
  videoCount: number | null;
  /** True when the playlist couldn't be resolved on YouTube (deleted/private). */
  unresolved: boolean;
}

export default function SeriesManager({ rows }: { rows: SeriesManagerRow[] }) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { confirm } = useDialog();
  const toast = useToast();
  const router = useRouter();

  async function addSeries() {
    const value = input.trim();
    if (!value) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/sermons/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add that series");
      toast.success(`Added the series “${data.snippet?.title ?? value}”`);
      setInput("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that series");
    } finally {
      setAdding(false);
    }
  }

  async function removeSeries(row: SeriesManagerRow) {
    const ok = await confirm({
      title: "Remove series",
      message: `Remove “${row.title ?? row.playlistId}” from the sermons page? The YouTube playlist itself is untouched.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;

    setRemovingId(row.playlistId);
    try {
      const res = await fetch(`/api/admin/sermons/series/${row.playlistId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not remove that series");
      toast.success(`Removed the series “${row.title ?? row.playlistId}”`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove that series");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-destiny-grey dark:text-white">Series</h2>
        <p className="mt-1 text-xs text-destiny-grey/55 dark:text-white/55">
          Add a YouTube playlist to turn it into a filterable series on /sermons. Its title and
          description always come straight from YouTube.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSeries()}
          placeholder="Paste a playlist URL or id"
          className={inputClass}
        />
        <button
          type="button"
          onClick={addSeries}
          disabled={adding || !input.trim()}
          className={`${primaryBtn} shrink-0`}
        >
          {adding ? "Adding…" : "Add series"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-destiny-grey/50 dark:text-white/50">No series added yet.</p>
      ) : (
        <div className="divide-y divide-black/5 rounded-2xl border border-black/5 dark:divide-white/8 dark:border-white/8">
          {rows.map((row) => (
            <div key={row.playlistId} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-destiny-grey dark:text-white">
                  {row.title ?? row.playlistId}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {row.unresolved ? (
                    <Badge tone="orange">Unresolved — check it&apos;s public</Badge>
                  ) : (
                    <Badge tone="grey">
                      {row.videoCount ?? 0} sermon{row.videoCount === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeSeries(row)}
                disabled={removingId === row.playlistId}
                className={`${dangerBtn} shrink-0 px-3 py-2 text-xs`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
