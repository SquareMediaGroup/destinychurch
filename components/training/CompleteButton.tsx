"use client";

import { useCompletedSet, toggleCompleted } from "./useTrainingProgress";

// "Mark as completed" toggle shown at the bottom of a training post.
// The completed set starts empty (filled after mount), so first render matches
// the server output — no hydration mismatch and no need for a mounted flag.
export default function CompleteButton({ postId }: { postId: string }) {
  const completed = useCompletedSet();
  const done = completed.has(postId);

  return (
    <div className="mt-12 flex flex-col items-center border-t border-black/5 pt-8">
      <button
        type="button"
        onClick={() => toggleCompleted(postId, !done)}
        className={`inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold transition ${
          done
            ? "bg-destiny-green/10 text-destiny-green hover:bg-destiny-green/15"
            : "bg-destiny-orange text-white shadow-lg shadow-destiny-orange/30 hover:brightness-110"
        }`}
      >
        <span className="material-symbols-rounded text-xl">
          {done ? "check_circle" : "radio_button_unchecked"}
        </span>
        {done ? "Completed" : "Mark as completed"}
      </button>
      {done && (
        <p className="mt-2 text-xs text-destiny-grey/45">Tap again to undo.</p>
      )}
    </div>
  );
}
