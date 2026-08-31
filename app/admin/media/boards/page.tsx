"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDialog } from "@/components/DialogProvider";
import {
  PageHeader,
  EmptyState,
  ErrorNote,
  ListToolbar,
  TableSkeleton,
  Toggle,
  Badge,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/AdminUI";
import { useAdminList } from "@/lib/useAdminList";

interface Board {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  allow_uploads: boolean;
  share_token: string;
  counts: { pending: number; approved: number; rejected: number };
}

export default function MediaBoardsPage() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media/boards");
      const data = await res.json();
      setBoards(Array.isArray(data) ? data : []);
    } catch {
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowForm(true);
  }, [searchParams]);

  const list = useAdminList<Board>({
    items: boards,
    searchKeys: [
      { name: "title", weight: 0.6 },
      { name: "slug", weight: 0.4 },
    ],
    sorts: { created: (a, b) => a.title.localeCompare(b.title) },
  });

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slug) {
      setSlug(val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const res = await fetch("/api/admin/media/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        description: description || null,
        is_public: isPublic,
        allow_uploads: true,
      }),
    });
    if (res.ok) {
      setTitle("");
      setSlug("");
      setDescription("");
      setIsPublic(true);
      setShowForm(false);
      await fetchBoards();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong");
    }
    setCreating(false);
  }

  async function handleTogglePublic(b: Board) {
    setBoards((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, is_public: !b.is_public } : x)),
    );
    const res = await fetch(`/api/admin/media/boards/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: !b.is_public }),
    });
    if (!res.ok) {
      setError("Could not change that board. Reloading the list.");
      fetchBoards();
    }
  }

  async function handleToggleUploads(b: Board) {
    setBoards((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, allow_uploads: !b.allow_uploads } : x)),
    );
    await fetch(`/api/admin/media/boards/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allow_uploads: !b.allow_uploads }),
    });
  }

  async function handleRegenerateLink(b: Board) {
    if (
      !(await confirm({
        title: "Regenerate share link",
        message: `The current link for "${b.title}" will stop working immediately. Anyone who still needs access will need the new one.`,
        confirmLabel: "Regenerate",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`/api/admin/media/boards/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate_token: true }),
    });
    if (res.ok) fetchBoards();
  }

  async function handleDelete(b: Board) {
    if (
      !(await confirm({
        title: "Delete board",
        message: `Delete "${b.title}" and all ${b.counts.pending + b.counts.approved + b.counts.rejected} of its photos? This can't be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`/api/admin/media/boards/${b.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete that board.");
      return;
    }
    setBoards((prev) => prev.filter((x) => x.id !== b.id));
  }

  function handleCopyLink(b: Board) {
    const url = `${window.location.origin}/media/s/${b.share_token}`;
    navigator.clipboard.writeText(url);
    setCopied(b.id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Media Boards"
        subtitle="Create boards, choose which are public, and share private ones by link."
        back={{ href: "/admin/media", label: "Media" }}
        action={
          <button className={primaryBtn} onClick={() => setShowForm((s) => !s)}>
            <span className="material-symbols-rounded text-lg">
              {showForm ? "close" : "add"}
            </span>
            {showForm ? "Cancel" : "New board"}
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {showForm && (
        <div className="mb-8 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-destiny-grey/50 dark:text-white/50">
            New board
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="board-title">
                  Title
                </label>
                <input
                  id="board-title"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  placeholder="e.g. Sunday Service"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="board-slug">
                  Web address
                </label>
                <div className="flex overflow-hidden rounded-xl border border-black/10 focus-within:border-destiny-orange/50 focus-within:ring-2 focus-within:ring-destiny-orange/15 dark:border-white/10">
                  <span className="flex items-center whitespace-nowrap border-r border-black/10 bg-black/5 px-3 text-xs text-destiny-grey/40 dark:border-white/10 dark:bg-white/5 dark:text-white/40">
                    /media/b/
                  </span>
                  <input
                    id="board-slug"
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
                    }
                    required
                    placeholder="sunday-service"
                    className="min-w-0 flex-1 px-3 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:outline-none dark:bg-destiny-grey-800 dark:text-white dark:placeholder:text-white/25"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="board-description">
                Description (optional)
              </label>
              <input
                id="board-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-3">
              <Toggle checked={isPublic} onChange={setIsPublic} label="Public board" />
              <span className="text-sm text-destiny-grey dark:text-white">
                {isPublic ? "Public — listed on /media" : "Private — shareable by link only"}
              </span>
            </label>

            <div className="flex justify-end gap-3">
              <button type="button" className={ghostBtn} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={creating} className={primaryBtn}>
                {creating ? "Creating…" : "Create board"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <TableSkeleton columns={3} />
      ) : boards.length === 0 ? (
        <EmptyState
          icon="photo_library"
          title="No boards yet"
          hint="Create a board like Sunday Service to start collecting photos."
          action={
            <button className={primaryBtn} onClick={() => setShowForm(true)}>
              <span className="material-symbols-rounded text-lg">add</span>
              New board
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search title or web address"
            noun="board"
            total={list.total}
            shown={list.shown}
          />

          <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
            <div className="divide-y divide-black/5 dark:divide-white/8">
              {list.visible.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-destiny-grey dark:text-white">{b.title}</span>
                      <Badge tone={b.is_public ? "green" : "grey"}>
                        {b.is_public ? "Public" : "Private"}
                      </Badge>
                      {b.counts.pending > 0 && (
                        <a
                          href={`/admin/media/queue?board_id=${b.id}`}
                          className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning"
                        >
                          {b.counts.pending} pending
                        </a>
                      )}
                    </div>
                    <p className="truncate text-xs text-destiny-grey/45 dark:text-white/45">
                      {b.is_public ? `/media/b/${b.slug}` : `/media/s/${b.share_token}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <button
                      onClick={() => handleCopyLink(b)}
                      title="Copy link"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-grey dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <span
                        className={`material-symbols-rounded text-base ${copied === b.id ? "text-destiny-green" : ""}`}
                      >
                        {copied === b.id ? "check" : "link"}
                      </span>
                    </button>
                    {!b.is_public && (
                      <button
                        onClick={() => handleRegenerateLink(b)}
                        title="Regenerate link"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-grey dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <span className="material-symbols-rounded text-base">refresh</span>
                      </button>
                    )}
                    <Toggle
                      checked={b.is_public}
                      onChange={() => handleTogglePublic(b)}
                      label={b.is_public ? "Make private" : "Make public"}
                    />
                    <Toggle
                      checked={b.allow_uploads}
                      onChange={() => handleToggleUploads(b)}
                      label={b.allow_uploads ? "Stop accepting uploads" : "Accept uploads"}
                    />
                    <button
                      onClick={() => handleDelete(b)}
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/30 transition hover:bg-destiny-red/10 hover:text-destiny-red dark:text-white/30"
                    >
                      <span className="material-symbols-rounded text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
