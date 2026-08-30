"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import {
  API,
  type TrainingCategory,
  type TrainingSubgroup,
  type TrainingFolder,
  type TrainingPost,
} from "@/lib/training";
import {
  PageHeader,
  Badge,
  EmptyState,
  ErrorNote,
  SearchInput,
  TableSkeleton,
  primaryBtn,
} from "@/components/admin/AdminUI";
import { PostEditor } from "@/components/admin/training/PostEditor";
import { FolderModal } from "@/components/admin/training/FolderModal";
import { useReorder } from "@/components/admin/training/useReorder";
import { useDialog } from "@/components/DialogProvider";

function PostListSection({
  folder,
  items,
  setItems,
  onDropPost,
  togglePublish,
  setEditing,
  remove,
  liveBase,
  setError,
}: {
  folder: TrainingFolder | null;
  items: TrainingPost[];
  setItems: React.Dispatch<React.SetStateAction<TrainingPost[]>>;
  onDropPost: (postId: string, folderId: string | null) => void;
  togglePublish: (p: TrainingPost) => void;
  setEditing: (p: TrainingPost) => void;
  remove: (p: TrainingPost) => void;
  liveBase: string | null;
  setError: (m: string) => void;
}) {
  const { rowProps } = useReorder(items, setItems, (id) => `${API}/posts/${id}`, setError);

  return (
    <div
      className="mb-10"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        const data = e.dataTransfer.getData("application/json");
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.folderId !== (folder?.id || null)) {
              onDropPost(parsed.postId, folder?.id || null);
            }
          } catch {}
        }
      }}
    >
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-[#f5f7fa] p-8 text-center text-sm font-medium text-destiny-grey/40 dark:text-white/40">
          Drop posts here
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
              <tr>
                <th className="w-10 px-2 py-3.5"></th>
                <th className="px-5 py-3.5">Post</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {items.map((p, idx) => (
                <tr
                  key={p.id}
                  {...rowProps(idx)}
                  onDragStart={(e) => {
                    rowProps(idx).onDragStart(e);
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({ postId: p.id, folderId: p.folder_id || null })
                    );
                  }}
                  onClick={() => setEditing(p)}
                  className="group cursor-pointer transition hover:bg-[#f5f7fa] dark:hover:bg-white/10"
                >
                  <td className="px-2 py-3.5 text-center">
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="material-symbols-rounded cursor-grab text-xl text-destiny-grey/25 dark:text-white/25 active:cursor-grabbing"
                      title="Drag to move or reorder"
                    >
                      drag_indicator
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-destiny-grey dark:text-white transition group-hover:text-destiny-orange">{p.title}</p>
                    {p.summary && (
                      <p className="mt-0.5 text-xs text-destiny-grey/45 dark:text-white/45">{p.summary}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePublish(p);
                      }} 
                      title="Toggle publish"
                    >
                      <Badge tone={p.is_published ? "green" : "grey"}>
                        {p.is_published ? "Published" : "Draft"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      {p.is_published && liveBase && (
                        <a
                          href={`${liveBase}/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange"
                          aria-label="View live"
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
                        className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange group-hover:text-destiny-orange"
                        aria-label="Edit"
                      >
                        <span className="material-symbols-rounded text-xl">edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(p);
                        }}
                        className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-red"
                        aria-label="Delete"
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
    </div>
  );
}

/**
 * Flat list of every matching post across all folders, shown while a search is
 * active. Posts here live in hand-ordered folders, so a filtered view can't
 * offer drag-reorder — but "which folder is that video in?" is exactly the
 * question this page couldn't answer before, so search returns the answer with
 * the folder named on each row.
 */
function SearchResults({
  posts,
  folders,
  onEdit,
  togglePublish,
  remove,
  liveBase,
}: {
  posts: TrainingPost[];
  folders: TrainingFolder[];
  onEdit: (p: TrainingPost) => void;
  togglePublish: (p: TrainingPost) => void;
  remove: (p: TrainingPost) => void;
  liveBase: string | null;
}) {
  const folderName = (id: string | null) =>
    id ? (folders.find((f) => f.id === id)?.name ?? "Unknown folder") : "Ungrouped";

  return (
    <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
          <tr>
            <th className="px-5 py-3.5">Post</th>
            <th className="hidden px-5 py-3.5 sm:table-cell">Folder</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {posts.map((p) => (
            <tr
              key={p.id}
              onClick={() => onEdit(p)}
              className="group cursor-pointer transition hover:bg-[#f5f7fa] dark:hover:bg-white/10"
            >
              <td className="px-5 py-3.5">
                <p className="font-bold text-destiny-grey dark:text-white transition group-hover:text-destiny-orange">
                  {p.title}
                </p>
                {p.summary && (
                  <p className="mt-0.5 text-xs text-destiny-grey/45 dark:text-white/45">{p.summary}</p>
                )}
              </td>
              <td className="hidden px-5 py-3.5 sm:table-cell">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-destiny-grey/50 dark:text-white/50">
                  <span className="material-symbols-rounded text-base text-destiny-orange/60">
                    {p.folder_id ? "folder" : "folder_open"}
                  </span>
                  {folderName(p.folder_id)}
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
                  {p.is_published && liveBase && (
                    <a
                      href={`${liveBase}/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange"
                      aria-label={`View ${p.title} live`}
                    >
                      <span className="material-symbols-rounded text-xl">open_in_new</span>
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(p);
                    }}
                    className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange group-hover:text-destiny-orange"
                    aria-label={`Edit ${p.title}`}
                  >
                    <span className="material-symbols-rounded text-xl">edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(p);
                    }}
                    className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-red"
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
  );
}

export default function TrainingPostsPage() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const { categoryId, subgroupId } = useParams<{
    categoryId: string;
    subgroupId: string;
  }>();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TrainingCategory | null>(null);
  const [subgroup, setSubgroup] = useState<TrainingSubgroup | null>(null);
  const [folders, setFolders] = useState<TrainingFolder[]>([]);
  const [posts, setPosts] = useState<TrainingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPost, setEditingPost] = useState<TrainingPost | "new" | null>(null);
  const [editingFolder, setEditingFolder] = useState<TrainingFolder | "new" | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [catRes, subRes, folderRes, postRes] = await Promise.all([
        fetch(`${API}/categories/${categoryId}`),
        fetch(`${API}/subgroups/${subgroupId}`),
        fetch(`${API}/folders?subgroup_id=${subgroupId}`),
        fetch(`${API}/posts?subgroup_id=${subgroupId}`),
      ]);
      setCategory(catRes.ok ? await catRes.json() : null);
      setSubgroup(subRes.ok ? await subRes.json() : null);
      setFolders(folderRes.ok ? await folderRes.json() : []);
      const data = await postRes.json();
      setPosts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [categoryId, subgroupId]);

  useEffect(() => {
    load();
  }, [load]);

  // ?open=<id> comes from a ⌘K search hit — jump straight into that post.
  const openId = searchParams.get("open");
  useEffect(() => {
    if (!openId || posts.length === 0) return;
    const match = posts.find((p) => p.id === openId);
    if (match) setEditingPost(match);
  }, [openId, posts]);

  const matches = useMemo(() => {
    const query = search.trim();
    if (!query) return [];
    const fuse = new Fuse(posts, {
      keys: [
        { name: "title", weight: 0.6 },
        { name: "summary", weight: 0.4 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    return fuse.search(query).map((hit) => hit.item);
  }, [posts, search]);

  const searching = search.trim().length > 0;

  const { rowProps: folderRowProps } = useReorder(
    folders,
    setFolders,
    (id) => `${API}/folders/${id}`,
    setError
  );

  async function onDropPost(postId: string, newFolderId: string | null) {
    setError("");
    const res = await fetch(`${API}/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: newFolderId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not move post.");
      return;
    }
    load();
  }

  async function togglePublish(post: TrainingPost) {
    setError("");
    const res = await fetch(`${API}/posts/${post.id}`, {
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

  async function remove(post: TrainingPost) {
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
    const res = await fetch(`${API}/posts/${post.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete.");
      return;
    }
    load();
  }

  async function removeFolder(folder: TrainingFolder) {
    if (
      !(await confirm({
        title: "Delete folder",
        message: `Delete folder "${folder.name}"? Posts inside will become ungrouped.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setError("");
    const res = await fetch(`${API}/folders/${folder.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete folder.");
      return;
    }
    setActiveFolderId(null);
    load();
  }

  const liveBase =
    category && subgroup
      ? `/training/${category.slug}/${subgroup.slug}`
      : null;

  const getPostsInFolder = (folderId: string | null) => {
    return posts.filter((p) => p.folder_id === folderId);
  };
  const setPostsInFolder = (folderId: string | null, newItems: TrainingPost[]) => {
    setPosts((all) => {
      const filtered = all.filter((p) => p.folder_id !== folderId);
      return [...filtered, ...newItems].sort((a, b) => a.sort_order - b.sort_order);
    });
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title={subgroup ? `${subgroup.name} — posts` : "Posts"}
        subtitle={
          category && subgroup
            ? `${category.name} · ${subgroup.has_password ? "Password protected" : "Open"}`
            : "Training posts in this sub-group."
        }
        back={{
          href: `/admin/training/${categoryId}`,
          label: category ? category.name : "Sub-groups",
        }}
        action={
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1.5 rounded-full bg-black/5 px-4 py-2 text-sm font-bold text-destiny-grey dark:text-white transition hover:bg-black/10"
              onClick={() => setEditingFolder("new")}
            >
              <span className="material-symbols-rounded text-lg">folder</span>
              New Folder
            </button>
            <button className={primaryBtn} onClick={() => setEditingPost("new")}>
              <span className="material-symbols-rounded text-lg">add</span>
              New post
            </button>
          </div>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {!loading && posts.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search posts in this sub-group"
          />
          <p className="text-xs font-bold tabular-nums text-destiny-grey/40 dark:text-white/40">
            {searching ? `${matches.length} of ${posts.length}` : posts.length} post
            {posts.length === 1 && !searching ? "" : "s"}
          </p>
        </div>
      )}

      {loading ? (
        <TableSkeleton columns={4} />
      ) : posts.length === 0 && folders.length === 0 ? (
        <EmptyState
          icon="article"
          title="No posts yet"
          hint="Create a folder or a training post to get started."
          action={
            <button className={primaryBtn} onClick={() => setEditingPost("new")}>
              <span className="material-symbols-rounded text-lg">add</span>
              New post
            </button>
          }
        />
      ) : searching ? (
        // Search spans every folder — the whole point is not needing to know
        // which one a post is in.
        matches.length === 0 ? (
          <EmptyState
            icon="search_off"
            title="No posts match"
            hint="Search looks at every folder in this sub-group."
            action={
              <button
                className="text-sm font-bold text-destiny-orange hover:brightness-110"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            }
          />
        ) : (
          <SearchResults
            posts={matches}
            folders={folders}
            onEdit={setEditingPost}
            togglePublish={togglePublish}
            remove={remove}
            liveBase={liveBase}
          />
        )
      ) : activeFolderId === null ? (
        // Grid View
        <div className="flex flex-col gap-8">
          {folders.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {folders.map((folder, idx) => {
                const count = getPostsInFolder(folder.id).length;
                return (
                  <div
                    key={folder.id}
                    {...folderRowProps(idx)}
                    onDragOver={(e) => {
                      folderRowProps(idx).onDragOver(e);
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      // Handle dropping a post into the folder
                      const data = e.dataTransfer.getData("application/json");
                      if (data) {
                        try {
                          const parsed = JSON.parse(data);
                          if (parsed.folderId !== folder.id) {
                            onDropPost(parsed.postId, folder.id);
                          }
                        } catch {}
                      }
                    }}
                    onClick={() => setActiveFolderId(folder.id)}
                    className="group relative flex cursor-pointer flex-col gap-2 rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5 shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="material-symbols-rounded text-3xl text-destiny-orange/80 transition group-hover:text-destiny-orange">
                        folder
                      </span>
                      <span
                        className="material-symbols-rounded cursor-grab text-xl text-black/10 transition hover:text-black/30 dark:text-white/15 dark:hover:text-white/40 active:cursor-grabbing"
                        title="Drag to reorder"
                        onClick={(e) => e.stopPropagation()} // Prevent card click when clicking drag handle
                      >
                        drag_indicator
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-destiny-grey dark:text-white">{folder.name}</h3>
                      <p className="text-xs font-medium text-destiny-grey/40 dark:text-white/40">
                        {count} post{count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {getPostsInFolder(null).length > 0 && (
            <div>
              {folders.length > 0 && (
                <h3 className="mb-3 text-xl font-bold text-destiny-grey dark:text-white">Ungrouped Posts</h3>
              )}
              <PostListSection
                folder={null}
                items={getPostsInFolder(null)}
                setItems={(newItems) => setPostsInFolder(null, newItems as any)}
                onDropPost={onDropPost}
                togglePublish={togglePublish}
                setEditing={setEditingPost}
                remove={remove}
                liveBase={liveBase}
                setError={setError}
              />
            </div>
          )}
        </div>
      ) : (
        // Folder View
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-2xl bg-[#f5f7fa] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveFolderId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-destiny-grey dark:text-white transition hover:bg-black/10"
              >
                <span className="material-symbols-rounded text-xl">arrow_back</span>
              </button>
              <h2 className="text-lg font-bold text-destiny-grey dark:text-white">
                {activeFolder?.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingFolder(activeFolder!)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/40 dark:text-white/40 transition hover:bg-black/5 hover:text-destiny-orange"
                title="Edit folder"
              >
                <span className="material-symbols-rounded text-xl">edit</span>
              </button>
              <button
                onClick={() => removeFolder(activeFolder!)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/40 dark:text-white/40 transition hover:bg-black/5 hover:text-destiny-red"
                title="Delete folder"
              >
                <span className="material-symbols-rounded text-xl">delete</span>
              </button>
            </div>
          </div>
          <PostListSection
            folder={activeFolder || null}
            items={getPostsInFolder(activeFolderId)}
            setItems={(newItems) => setPostsInFolder(activeFolderId, newItems as any)}
            onDropPost={onDropPost}
            togglePublish={togglePublish}
            setEditing={setEditingPost}
            remove={remove}
            liveBase={liveBase}
            setError={setError}
          />
        </div>
      )}

      {editingPost && (
        <PostEditor
          post={editingPost === "new" ? null : editingPost}
          folders={folders}
          subgroupId={subgroupId}
          nextSortOrder={posts.length}
          onClose={() => setEditingPost(null)}
          onSaved={() => {
            setEditingPost(null);
            setError("");
            load();
          }}
          onError={setError}
        />
      )}

      {editingFolder && (
        <FolderModal
          folder={editingFolder === "new" ? null : editingFolder}
          subgroupId={subgroupId}
          nextSortOrder={folders.length}
          onClose={() => setEditingFolder(null)}
          onSaved={() => {
            setEditingFolder(null);
            setError("");
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
