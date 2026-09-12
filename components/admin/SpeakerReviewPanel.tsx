"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

interface ReviewChange {
  videoId: string;
  title: string;
  before: string | null;
  after: string | null;
}

interface ReviewResult {
  reviewed: number;
  changed: ReviewChange[];
  skipped: number;
  errors: number;
}

export default function SpeakerReviewPanel() {
  const [running, setRunning] = useState(false);
  const [force, setForce] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sermons/review-speakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      setResult(data);
      toast.success(
        `Reviewed ${data.reviewed} sermon${data.reviewed === 1 ? "" : "s"} — ${data.changed.length} speaker${data.changed.length === 1 ? "" : "s"} corrected.`,
        "Speaker review complete"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speaker review failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-destiny-grey dark:text-white">
            AI speaker review
          </h2>
          <p className="mt-1 text-xs text-destiny-grey/55 dark:text-white/55">
            Checks every sermon&apos;s title and description against its parsed speaker and
            corrects it where it&apos;s wrong or missing. Skips sermons already reviewed unless
            you ask it to look again.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-destiny-grey/60 dark:text-white/60">
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
              className="h-4 w-4 rounded border-black/20"
            />
            Review everything again
          </label>
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="rounded-2xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {running ? "Reviewing…" : "Review speakers with AI"}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/8">
          <p className="text-xs font-bold text-destiny-grey/70 dark:text-white/70">
            {result.reviewed} reviewed · {result.changed.length} corrected · {result.skipped} already
            reviewed{result.errors ? ` · ${result.errors} failed` : ""}
          </p>
          {result.changed.length > 0 && (
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {result.changed.map((c) => (
                <div key={c.videoId} className="rounded-xl bg-[#f5f7fa] px-3 py-2 dark:bg-white/5">
                  <p className="truncate text-xs font-semibold text-destiny-grey dark:text-white">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-xs text-destiny-grey/55 dark:text-white/55">
                    {c.before ?? "(none)"} <span className="mx-1">→</span> {c.after ?? "(none)"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
