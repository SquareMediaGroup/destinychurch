"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API, type Post } from "@/lib/posts";
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

  const load = useCallback(async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

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
  useEffect(() => {
    if (!openId || posts.length === 0) return;
    const match = posts.find((p) => p.id === openId);
    if (match) setEditing(match);
  }, [openId, posts]);

  const list = useAdminList<Post>({
    items: posts,
    searchKeys: [
      { name: "title", weight: 0.7 },
      { name: "slug", weight: 0.3 },
    ],
    filters: [
      {
        key: "status",
        options: [
          { value: "published", label: "Published" },
          { value: "draft", label: "Draft" },
        ],
        match: (post, value) =>
          value === "published" ? post.is_published : !post.is_published,
      },
    ],
    sorts: {
      title: (a, b) => a.title.localeCompare(b.title),
      slug: (a, b) => a.slug.localeCompare(b.slug),
      status: (a, b) => Number(a.is_published) - Number(b.is_published),
      updated: (a, b) => a.updated_at.localeCompare(b.updated_at),
    },
  });

  const selection = useRowSelection(posts);
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
    const { id, created_at, updated_at, ...fields } = post;
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, title: `${post.title} (copy)`, slug, is_published: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not duplicate.");
      return;
    }
    await load();
    setEditing(data as Post);
  }

  async function remove(post: Post) {
    if (
      !(await confirm({
        title: "Delete post",
        message: `Delete "${post.title}"? This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setError("");
    const res = await fetch(`${API}/${post.id}`, { method: "DELETE" });
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
    if (
      !(await confirm({
        title: `Delete ${ids.length} post${ids.length === 1 ? "" : "s"}`,
        message: `This permanently deletes ${ids.length} post${ids.length === 1 ? "" : "s"}. This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setWorking(true);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${API}/${id}`, { method: "DELETE" }).then((r) => {
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
        <TableSkeleton columns={5} />
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
              <FilterChips
                label="Status"
                options={list.filterOptions("status")}
                value={list.filterValues.status}
                onChange={(v) => list.setFilter("status", v)}
              />
            }
          >
            <BulkBar count={selection.count} noun="post" onClear={selection.clear}>
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
              <button
                className="rounded-lg bg-destiny-red/10 px-3 py-1.5 text-xs font-bold text-destiny-red transition hover:bg-destiny-red/20 disabled:opacity-50"
                disabled={working}
                onClick={bulkDelete}
              >
                Delete
              </button>
            </BulkBar>
          </ListToolbar>

          {list.visible.length === 0 ? (
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
                      label="Edited"
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
                      onClick={() => setEditing(p)}
                      className={`group cursor-pointer transition hover:bg-[#f5f7fa] dark:hover:bg-white/10 ${
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
                          <p className="font-bold text-destiny-grey dark:text-white transition group-hover:text-destiny-orange">
                            {p.title}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-destiny-grey/50 dark:text-white/50">
                          /{p.slug}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePublish(p);
                          }}
                          title={p.is_published ? "Unpublish" : "Publish"}
                        >
                          <Badge tone={p.is_published ? "green" : "grey"}>
                            {p.is_published ? "Published" : "Draft"}
                          </Badge>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-destiny-grey/50 dark:text-white/50">
                        <time dateTime={p.updated_at} title={new Date(p.updated_at).toLocaleString()}>
                          {relativeTime(p.updated_at)}
                        </time>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-3">
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
                            aria-label={`Delete ${p.title}`}
                          >
                            <span className="material-symbols-rounded text-xl" aria-hidden="true">delete</span>
                          </button>
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
          onClose={() => setEditing(null)}
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

