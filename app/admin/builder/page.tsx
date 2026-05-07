"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TEMPLATES, getTemplate } from "@/lib/builder/templates";

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
  const [templateId, setTemplateId] = useState("blank");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    const tpl = getTemplate(templateId);
    const res = await fetch("/api/admin/builder/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        slug: newSlug || slugify(newTitle),
        layout_json: tpl ? tpl.build() : [],
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

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-destiny-grey/5 to-destiny-orange/5 px-6">
        <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-8 shadow-lg">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-destiny-orange/10 p-4">
              <span className="material-symbols-rounded text-4xl text-destiny-orange">
                desktop_mac
              </span>
            </div>
          </div>
          <h1 className="mb-3 text-center text-2xl font-black text-destiny-grey">
            Builder not available on mobile
          </h1>
          <p className="mb-6 text-center text-sm text-destiny-grey/60">
            The page builder is designed for desktop and tablet use. Please access it from a larger screen to create and manage pages.
          </p>
          <Link
            href="/admin"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-destiny-orange px-5 py-3 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            Back to admin
          </Link>
        </div>
      </div>
    );
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
        <div className="flex gap-2">
          <Link
            href="/admin/builder/ai"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition hover:brightness-110"
          >
            <span className="material-symbols-rounded text-base">sparkles</span>
            Create with AI
          </Link>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
          >
            <span className="material-symbols-rounded text-base">add</span>
            New page
          </button>
        </div>
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
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold text-destiny-grey/60">Start from a template</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {TEMPLATES.map((t) => {
                const selected = templateId === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-destiny-orange bg-destiny-orange/5 ring-2 ring-destiny-orange/20"
                        : "border-black/10 hover:bg-[#f5f7fa]"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base text-destiny-orange">
                      {t.icon}
                    </span>
                    <span className="text-xs font-bold text-destiny-grey">{t.name}</span>
                    <span className="text-[11px] text-destiny-grey/50">{t.description}</span>
                  </button>
                );
              })}
            </div>
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
                  {p.status === "published" && (
                    <a
                      href={`/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 text-destiny-grey/60 hover:bg-[#f5f7fa]"
                      title="View live"
                    >
                      <span className="material-symbols-rounded text-base">open_in_new</span>
                    </a>
                  )}
                  <Link
                    href={`/admin/builder/${p.id}/preview`}
                    className="rounded-lg p-1.5 text-destiny-grey/60 hover:bg-[#f5f7fa]"
                    title="Preview"
                  >
                    <span className="material-symbols-rounded text-base">visibility</span>
                  </Link>
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
