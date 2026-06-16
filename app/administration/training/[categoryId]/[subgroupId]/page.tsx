"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  API,
  type TrainingCategory,
  type TrainingSubgroup,
  type TrainingPost,
} from "@/lib/training";
import {
  HrHeader,
  Badge,
  EmptyState,
  primaryBtn,
} from "@/components/administration/hr/HrUI";
import { PostModal } from "@/components/administration/training/PostModal";
import { useReorder } from "@/components/administration/training/useReorder";

export default function TrainingPostsPage() {
  const { categoryId, subgroupId } = useParams<{
    categoryId: string;
    subgroupId: string;
  }>();
  const [category, setCategory] = useState<TrainingCategory | null>(null);
  const [subgroup, setSubgroup] = useState<TrainingSubgroup | null>(null);
  const [posts, setPosts] = useState<TrainingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<TrainingPost | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const [catRes, subRes, postRes] = await Promise.all([
        fetch(`${API}/categories/${categoryId}`),
        fetch(`${API}/subgroups/${subgroupId}`),
        fetch(`${API}/posts?subgroup_id=${subgroupId}`),
      ]);
      setCategory(catRes.ok ? await catRes.json() : null);
      setSubgroup(subRes.ok ? await subRes.json() : null);
      const data = await postRes.json();
      setPosts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [categoryId, subgroupId]);

  useEffect(() => {
    load();
  }, [load]);

  const { rowProps } = useReorder(
    posts,
    setPosts,
    (id) => `${API}/posts/${id}`,
    setError,
  );

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
          <button className={primaryBtn} onClick={() => setEditing("new")}>
            <span className="material-symbols-rounded text-lg">add</span>
            New post
          </button>
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-destiny-red/10 px-4 py-2.5 text-sm text-destiny-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-destiny-grey/50">Loading…</p>
      ) : posts.length === 0 ? (
        <EmptyState
          icon="article"
          title="No posts yet"
          hint="Create a training post with rich text and embedded videos."
        />
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
              {posts.map((p, idx) => (
                <tr
                  key={p.id}
                  {...rowProps(idx)}
                  className="transition hover:bg-[#f5f7fa]"
                >
                  <td className="px-2 py-3.5 text-center">
                    <span
                      className="material-symbols-rounded cursor-grab text-xl text-destiny-grey/25 active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      drag_indicator
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-destiny-grey">{p.title}</p>
                      {p.folder_name && (
                        <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/60">
                          {p.folder_name}
                        </span>
                      )}
                    </div>
                    {p.summary && (
                      <p className="mt-0.5 text-xs text-destiny-grey/45">
                        {p.summary}
                      </p>
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

      {editing && (
        <PostModal
          post={editing === "new" ? null : editing}
          subgroupId={subgroupId}
          nextSortOrder={posts.length}
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
