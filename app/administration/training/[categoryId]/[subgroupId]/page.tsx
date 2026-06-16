"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  API,
  type TrainingCategory,
  type TrainingSubgroup,
  type TrainingFolder,
  type TrainingPost,
} from "@/lib/training";
import {
  HrHeader,
  Badge,
  EmptyState,
  primaryBtn,
} from "@/components/administration/hr/HrUI";
import { PostModal } from "@/components/administration/training/PostModal";
import { FolderModal } from "@/components/administration/training/FolderModal";
import { useReorder } from "@/components/administration/training/useReorder";

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
      {folder && (
        <h3 className="mb-3 text-xl font-bold text-destiny-grey">{folder.name}</h3>
      )}
      {!folder && items.length > 0 && (
        <h3 className="mb-3 text-xl font-bold text-destiny-grey">Ungrouped Posts</h3>
      )}
      
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-[#f5f7fa] p-8 text-center text-sm font-medium text-destiny-grey/40">
          Drop posts here
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
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
                  className="transition hover:bg-[#f5f7fa]"
                >
                  <td className="px-2 py-3.5 text-center">
                    <span
                      className="material-symbols-rounded cursor-grab text-xl text-destiny-grey/25 active:cursor-grabbing"
                      title="Drag to move or reorder"
                    >
                      drag_indicator
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-destiny-grey">{p.title}</p>
                    {p.summary && (
                      <p className="mt-0.5 text-xs text-destiny-grey/45">{p.summary}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => togglePublish(p)} title="Toggle publish">
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
                          className="text-destiny-grey/40 transition hover:text-destiny-orange"
                          aria-label="View live"
                        >
                          <span className="material-symbols-rounded text-xl">
                            open_in_new
                          </span>
                        </a>
                      )}
                      <button
                        onClick={() => setEditing(p)}
                        className="text-destiny-grey/40 transition hover:text-destiny-orange"
                        aria-label="Edit"
                      >
                        <span className="material-symbols-rounded text-xl">edit</span>
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="text-destiny-grey/40 transition hover:text-destiny-red"
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

export default function TrainingPostsPage() {
  const { categoryId, subgroupId } = useParams<{
    categoryId: string;
    subgroupId: string;
  }>();
  const [category, setCategory] = useState<TrainingCategory | null>(null);
  const [subgroup, setSubgroup] = useState<TrainingSubgroup | null>(null);
  const [folders, setFolders] = useState<TrainingFolder[]>([]);
  const [posts, setPosts] = useState<TrainingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPost, setEditingPost] = useState<TrainingPost | "new" | null>(null);
  const [editingFolder, setEditingFolder] = useState<TrainingFolder | "new" | null>(null);

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
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setError("");
    const res = await fetch(`${API}/posts/${post.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete.");
      return;
    }
    load();
  }

  const liveBase =
    category && subgroup
      ? `/training/${category.slug}/${subgroup.slug}`
      : null;

  // Group posts into folders
  const getPostsInFolder = (folderId: string | null) => {
    return posts.filter((p) => p.folder_id === folderId);
  };
  const setPostsInFolder = (folderId: string | null, newItems: TrainingPost[]) => {
    setPosts((all) => {
      const filtered = all.filter((p) => p.folder_id !== folderId);
      return [...filtered, ...newItems].sort((a, b) => a.sort_order - b.sort_order);
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <HrHeader
        title={subgroup ? `${subgroup.name} — posts` : "Posts"}
        subtitle={
          category && subgroup
            ? `${category.name} · ${subgroup.has_password ? "Password protected" : "Open"}`
            : "Training posts in this sub-group."
        }
        back={{
          href: `/administration/training/${categoryId}`,
          label: category ? category.name : "Sub-groups",
        }}
        action={
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1.5 rounded-full bg-black/5 px-4 py-2 text-sm font-bold text-destiny-grey transition hover:bg-black/10"
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

      {error && (
        <p className="mb-4 rounded-xl bg-destiny-red/10 px-4 py-2.5 text-sm text-destiny-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-destiny-grey/50">Loading…</p>
      ) : posts.length === 0 && folders.length === 0 ? (
        <EmptyState
          icon="article"
          title="No posts yet"
          hint="Create a folder or a training post to get started."
        />
      ) : (
        <div>
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
          {folders.map((folder) => (
            <PostListSection
              key={folder.id}
              folder={folder}
              items={getPostsInFolder(folder.id)}
              setItems={(newItems) => setPostsInFolder(folder.id, newItems as any)}
              onDropPost={onDropPost}
              togglePublish={togglePublish}
              setEditing={setEditingPost}
              remove={remove}
              liveBase={liveBase}
              setError={setError}
            />
          ))}
        </div>
      )}

      {editingPost && (
        <PostModal
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
