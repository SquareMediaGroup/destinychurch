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
  primaryBtn,
} from "@/components/admin/AdminUI";
import { useAdminList, useRowSelection } from "@/lib/useAdminList";
import { PostEditor } from "@/components/admin/posts/PostEditor";
import { useDialog } from "@/components/DialogProvider";

export default function AdminPostsPage() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Post | "new" | null>(null);
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
    if (wantsNew) setEditing("new");
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
          <button className={primaryBtn} onClick={() => setEditing("new")}>
            <span className="material-symbols-rounded text-lg">add</span>
            New post
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="article"
          title="No posts yet"
          hint="Create a post to publish a standalone page at its own URL."
          action={
            <button className={primaryBtn} onClick={() => setEditing("new")}>
              <span className="material-symbols-rounded text-lg">add</span>
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
                className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:bg-black/10 disabled:opacity-50"
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
            <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
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
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {list.visible.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setEditing(p)}
                      className={`group cursor-pointer transition hover:bg-[#f5f7fa] ${
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
                        <p className="font-bold text-destiny-grey transition group-hover:text-destiny-orange">
                          {p.title}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-destiny-grey/50">
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
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-3">
                          {p.is_published && (
                            <a
                              href={`/${p.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-destiny-grey/40 transition hover:text-destiny-orange"
                              aria-label={`View ${p.title} live`}
                            >
                              <span className="material-symbols-rounded text-xl">
                                open_in_new
                              </span>
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(p);
                            }}
                            className="text-destiny-grey/40 transition hover:text-destiny-orange group-hover:text-destiny-orange"
                            aria-label={`Edit ${p.title}`}
                          >
                            <span className="material-symbols-rounded text-xl">edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(p);
                            }}
                            className="text-destiny-grey/40 transition hover:text-destiny-red"
                            aria-label={`Delete ${p.title}`}
                          >
                            <span className="material-symbols-rounded text-xl">delete</span>
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

      {editing && (
        <PostEditor
          post={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setError("");
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
