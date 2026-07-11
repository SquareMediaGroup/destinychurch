"use client";

import { useCallback, useEffect, useState } from "react";
import { API, type Post } from "@/lib/posts";
import {
  HrHeader,
  Badge,
  EmptyState,
  primaryBtn,
} from "@/components/admin/hr/HrUI";
import { PostEditor } from "@/components/admin/posts/PostEditor";
import { useDialog } from "@/components/DialogProvider";

export default function AdminPostsPage() {
  const { confirm } = useDialog();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Post | "new" | null>(null);

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

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <HrHeader
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
          hint="Create a post to publish a standalone page at its own URL."
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              <tr>
                <th className="px-5 py-3.5">Post</th>
                <th className="px-5 py-3.5">URL</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {posts.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setEditing(p)}
                  className="group cursor-pointer transition hover:bg-[#f5f7fa]"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-destiny-grey transition group-hover:text-destiny-orange">
                      {p.title}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-destiny-grey/50">/{p.slug}</span>
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
                      {p.is_published && (
                        <a
                          href={`/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-destiny-grey/40 transition hover:text-destiny-orange"
                          aria-label="View live"
                        >
                          <span className="material-symbols-rounded text-xl">open_in_new</span>
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(p);
                        }}
                        className="text-destiny-grey/40 transition hover:text-destiny-orange group-hover:text-destiny-orange"
                        aria-label="Edit"
                      >
                        <span className="material-symbols-rounded text-xl">edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(p);
                        }}
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
