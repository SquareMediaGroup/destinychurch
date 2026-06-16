"use client";

import { useCompletedSet } from "./useTrainingProgress";

// Completion progress bar shown in the (dark) sub-group hero. Reads per-browser
// completion and shows how many of this group's posts are done.
export default function TrainingProgress({ postIds }: { postIds: string[] }) {
  const completed = useCompletedSet();
  const total = postIds.length;
  if (total === 0) return null;

  const done = postIds.filter((id) => completed.has(id)).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mt-6 max-w-md">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/70">
        <span>
          {done} of {total} complete
        </span>
        <span>{pct}%</span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-destiny-orange transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
