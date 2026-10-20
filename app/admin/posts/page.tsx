"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API, BIN_DAYS, postState, type Post, type PostState } from "@/lib/posts";
import {
  PageHeader,
  Badge,
  EmptyState,
  ErrorNote,
  ListToolbar,
  FilterChips,
  SortHeader,
  TableSkeleton,
  BulkBar,
  Modal,
  primaryBtn,
} from "@/components/admin/AdminUI";
import { useToast } from "@/components/ToastProvider";
import { relativeTime } from "@/lib/audit";
import { POST_TEMPLATES, type PostTemplate } from "@/lib/postTemplates";
import { useAdminList, useRowSelection } from "@/lib/useAdminList";
import { PostEditor } from "@/components/admin/posts/PostEditor";
import { useDialog } from "@/components/DialogProvider";

export default function AdminPostsPage() {
  const { confirm } = useDialog();
  const toast = useToast();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Post | { template: PostTemplate } | null>(null);
  const [choosingTemplate, setChoosingTemplate] = useState(false);
  const [working, setWorking] = useState(false);
  // The Bin is its own view rather than a status chip, so "All" keeps meaning
  // every page that still exists.
  const [inBin, setInBin] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const livePosts = useMemo(() => posts.filter((p) => !p.deleted_at), [posts]);
  const binnedPosts = useMemo(() => posts.filter((p) => p.deleted_at), [posts]);
  const shownPosts = inBin ? binnedPosts : livePosts;
  // Every tag in use, most used first, for the filter chips and the editor.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of livePosts) for (const t of p.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [livePosts]);

  useEffect(() => {
    load();
  }, [load]);

  // ?new=1 from the ⌘K palette's "New post" action, ?open=<id> from a search
  // hit — both land you in the editor instead of on a list to scan.
  const openId = searchParams.get("open");
  const wantsNew = searchParams.get("new") === "1";
  useEffect(() => {
    if (wantsNew) setChoosingTemplate(true);
  }, [wantsNew]);
  // Open each ?open= id once. Without this, every reload of `posts` (saving,
  // publishing, closing the editor) reopened the editor while the param stayed
  // in the URL.
  const openedId = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || posts.length === 0 || openedId.current === openId) return;
    const match = posts.find((p) => p.id === openId && !p.deleted_at);
    if (match) {
      openedId.current = openId;
      setEditing(match);
    }
  }, [openId, posts]);

  const list = useAdminList<Post>({
    items: shownPosts,
    searchKeys: [
      { name: "title", weight: 0.6 },
      { name: "slug", weight: 0.25 },
      { name: "tags", weight: 0.15 },
    ],
    filters: [
      {
        key: "status",
        options: [
          { value: "live", label: "Live" },
          { value: "scheduled", label: "Scheduled" },
          { value: "ended", label: "Ended" },
          { value: "draft", label: "Draft" },
        ],
        match: (post, value) => postState(post) === value,
      },
      {
        key: "tag",
        options: allTags.map((t) => ({ value: t, label: t })),
        match: (post, value) => (post.tags ?? []).includes(value),
      },
    ],
    sorts: {
      title: (a, b) => a.title.localeCompare(b.title),
      slug: (a, b) => a.slug.localeCompare(b.slug),
      status: (a, b) => STATE_ORDER[postState(a)] - STATE_ORDER[postState(b)],
      updated: (a, b) => a.updated_at.localeCompare(b.updated_at),
      views: (a, b) => (a.views_30d ?? 0) - (b.views_30d ?? 0),
    },
  });

  const selection = useRowSelection(shownPosts);
  const visibleIds = useMemo(() => list.visible.map((p) => p.id), [list.visible]);

  async function togglePublish(post: Post) {
    setError("");
    const res = await fetch(`${API}/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !post.is_published }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update.");
      return;
    }
    load();
  }

  /** A draft copy at "<slug>-copy" (or -copy-2, …), opened straight in the editor. */
  async function duplicate(post: Post) {
    setError("");
    const taken = new Set(posts.map((p) => p.slug));
    let slug = `${post.slug}-copy`;
    for (let n = 2; taken.has(slug); n++) slug = `${post.slug}-copy-${n}`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, deleted_at, updated_by, views_30d, draft, publish_from, publish_until, ...fields } =
      post;
    // The copy starts from the latest saved version (draft included) with no
    // schedule of its own.
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, ...(draft ?? {}), title: `${post.title} (copy)`, slug, is_published: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not duplicate.");
      return;
    }
    await load();
    setEditing(data as Post);
  }

  /** Moves a post to the Bin, with an Undo on the toast. No confirm needed. */
  async function remove(post: Post) {
    setError("");
    const res = await fetch(`${API}/${post.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete.");
      return;
    }
    toast.push({
      tone: "success",
      title: "Moved to the Bin",
      message: `“${post.title}” is no longer live. It stays in the Bin for ${BIN_DAYS} days.`,
      actions: [{ label: "Undo", onClick: () => restore(post), variant: "primary" }],
    });
    load();
  }

  async function restore(post: Post) {
    setError("");
    const res = await fetch(`${API}/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not restore.");
      return;
    }
    load();
  }

  async function deleteForever(post: Post) {
    if (
      !(await confirm({
        title: "Delete for good",
        message: `Permanently delete "${post.title}"? This cannot be undone.`,
        confirmLabel: "Delete for good",
        tone: "danger",
      }))
    )
      return;
    setError("");
    const res = await fetch(`${API}/${post.id}?permanent=1`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete.");
      return;
    }
    load();
  }

  /* ── Bulk actions ─────────────────────────────────────────────────────── */
  // Publishing a campaign used to mean opening each post in turn. These run the
  // same per-row endpoints in parallel and report how many failed rather than
  // stopping at the first error.

  async function bulkPublish(publish: boolean) {
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    setWorking(true);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${API}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_published: publish }),
        }).then((r) => {
          if (!r.ok) throw new Error();
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) {
      setError(
        `${failed} of ${ids.length} could not be ${publish ? "published" : "unpublished"}.`,
      );
    }
    selection.clear();
    setWorking(false);
    load();
  }

  async function bulkDelete() {
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    const noun = `${ids.length} post${ids.length === 1 ? "" : "s"}`;
    if (
      !(await confirm(
        inBin
          ? {
              title: `Delete ${noun} for good`,
              message: `This permanently deletes ${noun}. This cannot be undone.`,
              confirmLabel: "Delete for good",
              tone: "danger",
            }
          : {
              title: `Move ${noun} to the Bin`,
              message: `They stop being live straight away and can be restored from the Bin for ${BIN_DAYS} days.`,
              confirmLabel: "Move to Bin",
              tone: "danger",
            },
      ))
    )
      return;
    setWorking(true);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${API}/${id}${inBin ? "?permanent=1" : ""}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error();
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) setError(`${failed} of ${ids.length} could not be deleted.`);
    selection.clear();
    setWorking(false);
    load();
  }

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selection.selected.has(id));

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="Posts"
        subtitle="Standalone pages — campaigns, temporary pages and one-off content."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          <button className={primaryBtn} onClick={() => setChoosingTemplate(true)}>
            <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
            New post
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={6} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="article"
          title="No posts yet"
          hint="Start from a template to publish a standalone page at its own URL."
          action={
            <button className={primaryBtn} onClick={() => setChoosingTemplate(true)}>
              <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
              New post
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search by title or URL"
            noun="post"
            total={list.total}
            shown={list.shown}
            filters={
              <div className="flex flex-wrap items-center gap-3">
                {!inBin && (
                  <FilterChips
                    label="Status"
                    options={list.filterOptions("status")}
                    value={list.filterValues.status}
                    onChange={(v) => list.setFilter("status", v)}
                  />
                )}
                {!inBin && allTags.length > 0 && (
                  <FilterChips
                    label="Tag"
                    options={list.filterOptions("tag")}
                    value={list.filterValues.tag}
                    onChange={(v) => list.setFilter("tag", v)}
                  />
                )}
                <button
                  type="button"
                  aria-pressed={inBin}
                  onClick={() => {
                    selection.clear();
                    setInBin((v) => !v);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    inBin
                      ? "bg-destiny-grey text-white dark:bg-white dark:text-destiny-grey"
                      : "border border-black/10 bg-white text-destiny-grey/60 hover:bg-[#f5f7fa] dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white/60"
                  }`}
                >
                  <span className="material-symbols-rounded text-[15px]" aria-hidden="true">
                    {inBin ? "arrow_back" : "delete"}
                  </span>
                  {inBin ? "Back to pages" : `Bin (${binnedPosts.length})`}
                </button>
              </div>
            }
          >
            <BulkBar count={selection.count} noun="post" onClear={selection.clear}>
              {!inBin && (
                <>
                  <button
                    className="rounded-lg bg-destiny-green/10 px-3 py-1.5 text-xs font-bold text-destiny-green transition hover:bg-destiny-green/20 disabled:opacity-50"
                    disabled={working}
                    onClick={() => bulkPublish(true)}
                  >
                    Publish
                  </button>
                  <button
                    className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-bold text-destiny-grey/70 dark:text-white/70 transition hover:bg-black/10 disabled:opacity-50"
                    disabled={working}
                    onClick={() => bulkPublish(false)}
                  >
                    Unpublish
                  </button>
                </>
              )}
              <button
                className="rounded-lg bg-destiny-red/10 px-3 py-1.5 text-xs font-bold text-destiny-red transition hover:bg-destiny-red/20 disabled:opacity-50"
                disabled={working}
                onClick={bulkDelete}
              >
                {inBin ? "Delete for good" : "Move to Bin"}
              </button>
            </BulkBar>
          </ListToolbar>

          {list.visible.length === 0 ? (
            inBin && !list.isFiltered ? (
              <EmptyState
                icon="delete"
                title="The Bin is empty"
                hint={`Deleted posts wait here for ${BIN_DAYS} days before they're gone for good.`}
              />
            ) : !inBin && !list.isFiltered ? (
              // Every post is in the Bin; the toolbar's Bin button is the way back.
              <EmptyState
                icon="article"
                title="No live or draft posts"
                hint="Everything is in the Bin. Restore a post from there, or start a new one."
                action={
                  <button className={primaryBtn} onClick={() => setChoosingTemplate(true)}>
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
                    New post
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon="search_off"
                title="No posts match"
                hint="Try a different word, or clear the filters."
                action={
                  <button
                    className="text-sm font-bold text-destiny-orange hover:brightness-110"
                    onClick={list.clearAll}
                  >
                    Clear search and filters
                  </button>
                }
              />
            )
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                  <tr>
                    <th className="w-10 pl-5 pr-0 py-3.5">
                      <input
                        type="checkbox"
                        aria-label="Select all shown"
                        checked={allVisibleSelected}
                        onChange={() => selection.toggleAll(visibleIds)}
                        className="accent-destiny-orange"
                      />
                    </th>
                    <SortHeader
                      label="Post"
                      field="title"
                      active={list.sortField === "title"}
                      direction={list.sortDirection}
                      onSort={list.toggleSort}
                    />
                    <SortHeader
                      label="URL"
                      field="slug"
                      active={list.sortField === "slug"}
                      direction={list.sortDirection}
                      onSort={list.toggleSort}
                    />
                    <SortHeader
                      label="Status"
                      field="status"
                      active={list.sortField === "status"}
                      direction={list.sortDirection}
                      onSort={list.toggleSort}
                    />
                    <SortHeader
                      label="Views"
                      field="views"
                      active={list.sortField === "views"}
                      direction={list.sortDirection}
                      onSort={list.toggleSort}
                    />
                    <SortHeader
                      label={inBin ? "Deleted" : "Edited"}
                      field="updated"
                      active={list.sortField === "updated"}
                      direction={list.sortDirection}
                      onSort={list.toggleSort}
                    />
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {list.visible.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => !inBin && setEditing(p)}
                      className={`group ${inBin ? "" : "cursor-pointer"} transition hover:bg-[#f5f7fa] dark:hover:bg-white/10 ${
                        selection.selected.has(p.id) ? "bg-destiny-orange/5" : ""
                      }`}
                    >
                      <td className="w-10 py-3.5 pl-5 pr-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.title}`}
                          checked={selection.selected.has(p.id)}
                          onChange={() => selection.toggle(p.id)}
                          className="accent-destiny-orange"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <PostThumb post={p} />
                          <div className="min-w-0">
                            <p className="font-bold text-destiny-grey dark:text-white transition group-hover:text-destiny-orange">
                              {p.title}
                            </p>
                            {(p.tags ?? []).length > 0 && (
                              <p className="mt-0.5 flex flex-wrap gap-1">
                                {p.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="rounded-full bg-black/5 px-1.5 py-px text-[10px] font-bold text-destiny-grey/55 dark:bg-white/10 dark:text-white/55"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-destiny-grey/50 dark:text-white/50">
                          /{p.slug}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {inBin ? (
                          <Badge tone="grey">In Bin</Badge>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePublish(p);
                            }}
                            title={p.is_published ? "Unpublish" : "Publish"}
                          >
                            <Badge tone={STATE_BADGE[postState(p)].tone}>{STATE_BADGE[postState(p)].label}</Badge>
                          </button>
                        )}
                        {!inBin && <ScheduleNote post={p} />}
                      </td>
                      <td
                        className="whitespace-nowrap px-5 py-3.5 text-xs tabular-nums text-destiny-grey/60 dark:text-white/60"
                        title="Visits in the last 30 days, not counting bots"
                      >
                        {p.is_published || p.views_30d ? (p.views_30d ?? 0).toLocaleString() : "–"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-destiny-grey/50 dark:text-white/50">
                        {(() => {
                          const at = inBin && p.deleted_at ? p.deleted_at : p.updated_at;
                          return (
                            <time dateTime={at} title={new Date(at).toLocaleString()}>
                              {relativeTime(at)}
                            </time>
                          );
                        })()}
                        {p.updated_by && (
                          <span className="block max-w-[10rem] truncate text-[11px] text-destiny-grey/40 dark:text-white/40">
                            by {p.updated_by}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-3">
                          {inBin ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  restore(p);
                                }}
                                className="rounded-lg bg-destiny-green/10 px-2.5 py-1 text-xs font-bold text-destiny-green transition hover:bg-destiny-green/20"
                              >
                                Restore
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteForever(p);
                                }}
                                className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-red"
                                aria-label={`Delete ${p.title} for good`}
                                title="Delete for good"
                              >
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">delete_forever</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {p.is_published && (
                                <a
                                  href={`/${p.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange"
                                  aria-label={`View ${p.title} live`}
                                >
                                  <span className="material-symbols-rounded text-xl" aria-hidden="true">
                                    open_in_new
                                  </span>
                                </a>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditing(p);
                                }}
                                className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange group-hover:text-destiny-orange"
                                aria-label={`Edit ${p.title}`}
                              >
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">edit</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicate(p);
                                }}
                                className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange"
                                aria-label={`Duplicate ${p.title}`}
                                title="Duplicate"
                              >
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">content_copy</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  remove(p);
                                }}
                                className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-red"
                                aria-label={`Move ${p.title} to the Bin`}
                                title="Move to Bin"
                              >
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {choosingTemplate && (
        <Modal title="New post" onClose={() => setChoosingTemplate(false)}>
          <p className="mb-4 text-sm text-destiny-grey/60 dark:text-white/60">
            Pick a starting point. Everything in it can be changed or removed.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {POST_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setChoosingTemplate(false);
                  setEditing({ template: t });
                }}
                className="flex items-start gap-3 rounded-2xl border border-black/10 p-4 text-left transition hover:border-destiny-orange/50 hover:bg-destiny-orange/5 dark:border-white/10"
              >
                <span className="material-symbols-rounded text-2xl text-destiny-orange" aria-hidden="true">
                  {t.icon}
                </span>
                <span>
                  <span className="block font-bold text-destiny-grey dark:text-white">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-destiny-grey/55 dark:text-white/55">
                    {t.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {editing && (
        <PostEditor
          // A duplicate swaps one open editor for another; the key remounts it.
          key={"id" in editing ? editing.id : "new"}
          post={"id" in editing ? editing : null}
          template={"template" in editing ? editing.template : undefined}
          tagSuggestions={allTags}
          // Draft saves don't close the editor, so refresh on the way out too.
          onClose={() => {
            setEditing(null);
            load();
          }}
          onSaved={() => {
            setEditing(null);
            setError("");
            load();
          }}
          // The editor covers the page, so its errors can't go in the ErrorNote.
          onError={(msg) => toast.error(msg)}
        />
      )}
    </div>
  );
}

const STATE_ORDER: Record<PostState, number> = { draft: 0, scheduled: 1, live: 2, ended: 3 };

const STATE_BADGE: Record<PostState, { label: string; tone: string }> = {
  live: { label: "Live", tone: "green" },
  scheduled: { label: "Scheduled", tone: "orange" },
  ended: { label: "Ended", tone: "grey" },
  draft: { label: "Draft", tone: "grey" },
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** The line under the status badge: when it goes live or ends, and waiting changes. */
function ScheduleNote({ post }: { post: Post }) {
  const state = postState(post);
  const note =
    state === "scheduled" && post.publish_from
      ? `Goes live ${shortDate(post.publish_from)}`
      : state === "live" && post.publish_until
        ? `Ends ${shortDate(post.publish_until)}`
        : state === "ended" && post.publish_until
          ? `Ended ${shortDate(post.publish_until)}`
          : null;
  if (!note && !(post.draft && post.is_published)) return null;
  return (
    <span className="mt-1 block space-y-0.5 text-[11px] text-destiny-grey/45 dark:text-white/45">
      {note && <span className="block whitespace-nowrap">{note}</span>}
      {post.draft && post.is_published && (
        <span className="block whitespace-nowrap text-amber-700 dark:text-amber-300">Unpublished changes</span>
      )}
    </span>
  );
}

function PostThumb({ post }: { post: Post }) {
  const src = post.hero_image_url || post.og_image_url;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded URL from Supabase Storage
      <img src={src} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex h-10 w-14 shrink-0 items-center justify-center rounded-lg ${
        post.hero_style === "banner" ? "bg-destiny-orange/15 text-destiny-orange" : "bg-black/5 text-destiny-grey/30 dark:bg-white/5 dark:text-white/30"
      }`}
    >
      <span className="material-symbols-rounded text-lg">article</span>
    </span>
  );
}

