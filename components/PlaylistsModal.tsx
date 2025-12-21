"use client";

import { useState } from "react";
import ConfirmSubmit from "./ConfirmSubmit";
import PlaylistComposer from "./PlaylistComposer";
import { Sermon } from "@/lib/types";

type PlaylistsModalProps = {
  sermons: Sermon[];
};

export default function PlaylistsModal({ sermons }: PlaylistsModalProps) {
  const [open, setOpen] = useState(false);
  const suggestions = sermons.slice(0, 6);

  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-destiny-black">Playlists</p>
          <p className="text-xs text-destiny-grey/80">Open composer when needed to save space.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-destiny-blue px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
        >
          Manage playlists
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-5xl rounded-2xl bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Create playlist</p>
                <p className="text-xs text-destiny-grey/70">
                  Only admins can create them; they are public and play straight through.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
              >
                Close
              </button>
            </div>

            <form
              action="/api/admin/create-playlist"
              method="post"
              className="mt-4 grid gap-3 md:grid-cols-2"
              aria-label="Create playlist"
            >
              <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
                <span className="text-xs uppercase tracking-wide text-destiny-grey/70">Title</span>
                <input
                  type="text"
                  name="title"
                  placeholder="Summer of Psalms"
                  className="w-full rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                  required
                />
              </label>
              <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
                <span className="text-xs uppercase tracking-wide text-destiny-grey/70">Slug (optional)</span>
                <input
                  type="text"
                  name="slug"
                  placeholder="summer-psalms"
                  className="w-full rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                />
              </label>
              <div className="md:col-span-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destiny-grey/70">
                  Pick sermons for this playlist
                </p>
                <PlaylistComposer sermons={sermons} />
              </div>
              <label className="md:col-span-2 space-y-1 text-sm font-semibold text-[var(--foreground)]">
                <span className="text-xs uppercase tracking-wide text-destiny-grey/70">Description</span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="All messages from the Romans series."
                  className="w-full rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                />
              </label>
              <div className="md:col-span-2 flex justify-end">
                <ConfirmSubmit
                  className="rounded-full bg-destiny-blue px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
                  confirmMessage="Create this public playlist?"
                  pendingLabel="Creating..."
                >
                  Create playlist
                </ConfirmSubmit>
              </div>
            </form>

            <div className="mt-4 rounded-xl border border-black/5 bg-destiny-blue/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-destiny-grey/70">
                Recent sermon identifiers
              </p>
              {suggestions.length === 0 ? (
                <p className="mt-2 text-sm text-destiny-grey">No sermons yet. Sync first.</p>
              ) : (
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {suggestions.map((sermon) => (
                    <div
                      key={sermon.id}
                      className="rounded-lg border border-black/5 bg-white px-3 py-2 text-xs text-destiny-grey"
                    >
                      <p className="line-clamp-1 font-semibold text-destiny-black">{sermon.title}</p>
                      <p className="truncate">ID: {sermon.id}</p>
                      <p className="truncate">YouTube: {sermon.youtubeVideoId || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
