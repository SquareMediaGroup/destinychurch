"use client";

import { useEffect, useState } from "react";
import { API, type PostFields } from "@/lib/posts";
import { relativeTime } from "@/lib/audit";
import { useDialog } from "@/components/DialogProvider";

interface RevisionRow {
  id: string;
  kind: "draft" | "published";
  created_by: string | null;
  created_at: string;
  title: string | null;
}

/**
 * A post's saved versions. "Bring back" loads one into the editor, unsaved —
 * nothing on the site changes until the admin saves a draft or publishes, so
 * a restore is as reviewable (and as undoable) as any other edit.
 *
 * `refreshKey` changes after each save so a new version shows up.
 */
export function HistoryPanel({
  postId,
  refreshKey,
  onRestore,
}: {
  postId: string | undefined;
  refreshKey: string | undefined;
  onRestore: (snapshot: Partial<PostFields>) => void;
}) {
  const { confirm } = useDialog();
  const [rows, setRows] = useState<RevisionRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    fetch(`${API}/${postId}/revisions`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !Array.isArray(data)) {
          setError(data?.error || "Couldn't load the history.");
          return;
        }
        setError("");
        setRows(data);
      })
      .catch(() => !cancelled && setError("Couldn't load the history."));
    return () => {
      cancelled = true;
    };
  }, [postId, refreshKey]);

  async function bringBack(row: RevisionRow) {
    if (
      !(await confirm({
        title: "Bring back this version?",
        message:
          "It replaces what's in the editor now. Nothing changes on the site until you save a draft or publish, and the current version stays in History.",
        confirmLabel: "Bring it back",
      }))
    )
      return;
    setBusy(row.id);
    try {
      const res = await fetch(`${API}/${postId}/revisions/${row.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.snapshot) {
        setError(data.error || "Couldn't load that version.");
        return;
      }
      onRestore(data.snapshot as Partial<PostFields>);
    } finally {
      setBusy(null);
    }
  }

  if (!postId) {
    return <p className="p-4 text-xs text-destiny-grey/55 dark:text-white/55">Save the page to start its history.</p>;
  }
  return (
    <div className="h-full overflow-y-auto p-4">
      <p className="mb-3 text-xs text-destiny-grey/55 dark:text-white/55">
        Every save is kept (the newest 30). Bring one back to edit it.
      </p>
      {error && <p className="mb-3 text-xs font-medium text-destiny-red">{error}</p>}
      {rows === null && !error ? (
        <p className="text-xs text-destiny-grey/40 dark:text-white/40">Loading…</p>
      ) : rows && rows.length === 0 ? (
        <p className="text-xs text-destiny-grey/40 dark:text-white/40">No saved versions yet.</p>
      ) : (
        <ol className="space-y-2">
          {rows?.map((row, i) => (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded-xl border border-black/8 px-3 py-2.5 dark:border-white/8"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-bold text-destiny-grey dark:text-white">
                  <time dateTime={row.created_at} title={new Date(row.created_at).toLocaleString()}>
                    {relativeTime(row.created_at)}
                  </time>
                  <span
                    className={`rounded-full px-1.5 py-px text-[10px] uppercase tracking-wider ${
                      row.kind === "published"
                        ? "bg-destiny-green/10 text-destiny-green"
                        : "bg-black/5 text-destiny-grey/50 dark:bg-white/10 dark:text-white/50"
                    }`}
                  >
                    {row.kind === "published" ? "Published" : "Draft"}
                  </span>
                  {i === 0 && <span className="text-[10px] font-medium text-destiny-grey/40 dark:text-white/40">Latest</span>}
                </p>
                <p className="truncate text-[11px] text-destiny-grey/50 dark:text-white/50">
                  {row.title || "Untitled"}
                  {row.created_by ? ` · ${row.created_by}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => bringBack(row)}
                className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1 text-xs font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa] disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
              >
                {busy === row.id ? "Loading…" : "Bring back"}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
