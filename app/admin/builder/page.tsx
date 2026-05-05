"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export default function BuilderListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/builder/pages")
      .then((r) => r.json())
      .then((d) => setPages(d.pages || []))
      .finally(() => setLoading(false));
  }, []);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const res = await fetch("/api/admin/builder/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        slug: newSlug || slugify(newTitle),
        layout_json: [],
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Failed to create page");
      return;
    }
    router.push(`/admin/builder/${data.page.id}`);
  }

  async function deletePage(id: string) {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/builder/pages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPages((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-destiny-grey">Page Builder</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Create and manage custom pages with the visual builder.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-base">add</span>
          New page
        </button>
      </div>

      {showNew && (
        <form
          onSubmit={createPage}
          className="mb-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        >
          <p className="mb-4 text-sm font-bold text-destiny-grey">Create new page</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-destiny-grey/60">Title</span>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (!newSlug) setNewSlug(slugify(e.target.value));
                }}
                placeholder="About Us"
                required
                className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-destiny-grey/60">
                URL slug
              </span>
              <div className="flex items-center rounded-xl border border-black/10 px-4 py-2.5 text-sm">
                <span className="text-destiny-grey/40">/</span>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(slugify(e.target.value))}
                  placeholder="about-us"
                  required
                  className="flex-1 bg-transparent text-destiny-grey focus:outline-none"
                />
              </div>
            </label>
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-bold text-destiny-grey hover:bg-[#f5f7fa]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newTitle}
              className="rounded-xl bg-destiny-orange px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create & open"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
              progress_activity
            </span>
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="material-symbols-rounded text-4xl text-destiny-grey/20">
              article
            </span>
            <p className="text-sm font-bold text-destiny-grey/40">No pages yet</p>
            <p className="text-xs text-destiny-grey/40">
              Click &quot;New page&quot; to create your first builder page.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {pages.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex flex-col">
                  <Link
                    href={`/admin/builder/${p.id}`}
                    className="text-sm font-bold text-destiny-grey hover:text-destiny-orange"
                  >
                    {p.title}
                  </Link>
                  <span className="text-xs text-destiny-grey/50">
                    /{p.slug} · updated {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      p.status === "published"
                        ? "bg-green-100 text-green-700"
                        : p.status === "draft"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-destiny-grey/10 text-destiny-grey/60"
                    }`}
                  >
                    {p.status}
                  </span>
                  <Link
                    href={`/admin/builder/${p.id}`}
                    className="rounded-lg p-1.5 text-destiny-grey/60 hover:bg-[#f5f7fa]"
                    title="Edit"
                  >
                    <span className="material-symbols-rounded text-base">edit</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => deletePage(p.id)}
                    className="rounded-lg p-1.5 text-destiny-grey/60 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <span className="material-symbols-rounded text-base">delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
