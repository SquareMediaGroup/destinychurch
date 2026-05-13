"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/builder/templates";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  source_type?: "json" | "code";
  source_path?: string | null;
  repo_commit?: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type FilterKey = "all" | "published" | "draft" | "archived";

export default function BuilderListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [newOpen, setNewOpen] = useState(false);

  // Auto-index runs silently on every mount so the listing always reflects
  // what's on disk. Errors are non-fatal — we still show whatever's in the DB.
  async function syncAndLoad() {
    setLoading(true);
    try {
      await fetch("/api/admin/builder/code/index", { method: "POST" });
    } catch {
      // ignore — listing fetch below will still work
    }
    try {
      const r = await fetch("/api/admin/builder/pages");
      const d = await r.json();
      setPages(d.pages || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    syncAndLoad();
  }, []);

  async function deletePage(id: string) {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/builder/pages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPages((prev) => prev.filter((p) => p.id !== id));
    }
  }

  const counts = useMemo(() => {
    return {
      all: pages.length,
      published: pages.filter((p) => p.status === "published").length,
      draft: pages.filter((p) => p.status === "draft").length,
      archived: pages.filter((p) => p.status === "archived").length,
    };
  }, [pages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pages
      .filter((p) => (filter === "all" ? true : p.status === filter))
      .filter((p) => {
        if (!q) return true;
        return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [pages, filter, search]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-destiny-grey/50">
                Page Builder
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-destiny-grey md:text-3xl">
                Pages
              </h1>
              <p className="mt-1 text-sm text-destiny-grey/60">
                AI-generated pages on the site, plus draft pages still in
                progress.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destiny-orange px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
              >
                <span className="material-symbols-rounded text-base">add</span>
                New page
              </button>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
              >
                <span className="material-symbols-rounded text-base">arrow_back</span>
                Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* List + filters */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Filter chips + search in a single compact row */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1">
            {(["all", "published", "draft", "archived"] as FilterKey[]).map((k) => {
              const active = filter === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold capitalize transition ${
                    active
                      ? "bg-destiny-grey text-white"
                      : "bg-transparent text-destiny-grey/60 hover:bg-[#f5f7fa]"
                  }`}
                >
                  {k}
                  <span
                    className={`tabular-nums text-[10px] ${
                      active ? "text-white/60" : "text-destiny-grey/40"
                    }`}
                  >
                    {counts[k]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-rounded pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-destiny-grey/30">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-black/10 bg-white px-8 py-1.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-grey/40 focus:outline-none focus:ring-2 focus:ring-destiny-grey/10"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <ul className="space-y-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className="h-14 animate-pulse rounded-lg border border-black/5 bg-white"
              />
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasSearch={Boolean(search) || filter !== "all"}
            onCreate={() => setNewOpen(true)}
          />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-black/5 bg-white">
            {filtered.map((p, i) => (
              <PageRow
                key={p.id}
                page={p}
                isLast={i === filtered.length - 1}
                onDelete={() => deletePage(p.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {newOpen && (
        <NewPageDialog
          existingSlugs={pages.map((p) => p.slug)}
          onClose={() => setNewOpen(false)}
          onCreated={(id) => router.push(`/admin/builder/${id}`)}
        />
      )}
    </div>
  );
}

function PageRow({
  page,
  isLast,
  onDelete,
}: {
  page: PageRow;
  isLast: boolean;
  onDelete: () => void;
}) {
  const updated = new Date(page.updated_at);
  const isPublished = page.status === "published";
  const isAI = page.source_type === "code";
  const editHref = isAI
    ? `/admin/builder/code/${page.id}`
    : `/admin/builder/${page.id}`;

  const statusDot =
    page.status === "published"
      ? "bg-emerald-500"
      : page.status === "draft"
        ? "bg-amber-500"
        : "bg-destiny-grey/30";

  return (
    <li
      className={`group relative ${isLast ? "" : "border-b border-black/5"}`}
    >
      <Link
        href={editHref}
        className="flex items-center gap-3 px-4 py-3 transition hover:bg-[#fafafa]"
      >
        {/* Status dot */}
        <span
          className={`h-2 w-2 flex-shrink-0 rounded-full ${statusDot}`}
          aria-label={page.status}
        />

        {/* Title + slug */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-destiny-grey">
              {page.title}
            </span>
            {isAI && (
              <span
                className="inline-flex items-center rounded border border-black/10 bg-[#fafafa] px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-destiny-grey/60"
                title="Generated by AI"
              >
                AI
              </span>
            )}
          </div>
          <p className="truncate font-mono text-[11px] text-destiny-grey/45">
            /{page.slug}
          </p>
        </div>

        {/* Meta */}
        <span className="hidden flex-shrink-0 text-[11px] text-destiny-grey/40 sm:inline">
          {formatRelative(updated)}
        </span>

        {/* Actions (visible on hover) */}
        <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          {isPublished && (
            <a
              href={`/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              title="View live page"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-destiny-grey/50 hover:bg-black/5 hover:text-destiny-grey"
            >
              <span className="material-symbols-rounded text-base">open_in_new</span>
            </a>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-destiny-grey/50 hover:bg-red-50 hover:text-red-600"
          >
            <span className="material-symbols-rounded text-base">delete</span>
          </button>
        </div>
      </Link>
    </li>
  );
}

function EmptyState({
  hasSearch,
  onCreate,
}: {
  hasSearch: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-black/15 bg-white py-16 text-center">
      <span className="material-symbols-rounded text-3xl text-destiny-grey/30">
        {hasSearch ? "search_off" : "description"}
      </span>
      <h3 className="mt-3 text-sm font-bold text-destiny-grey">
        {hasSearch ? "No matching pages" : "No pages yet"}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-destiny-grey/50">
        {hasSearch
          ? "Try a different filter or search term."
          : "Get started by creating a new page from a template or with AI."}
      </p>
      {!hasSearch && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-destiny-orange px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-sm">add</span>
          Create your first page
        </button>
      )}
    </div>
  );
}

function NewPageDialog({
  existingSlugs,
  onClose,
  onCreated,
}: {
  existingSlugs: string[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  type Mode = "chooser" | "template";
  const [mode, setMode] = useState<Mode>("chooser");
  const [templateId, setTemplateId] = useState<string>("blank");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const slugTaken = existingSlugs.includes(slug.trim().toLowerCase());
  const slugValid = /^[a-z0-9][a-z0-9-]{0,60}$/.test(slug.trim());
  const canSubmit =
    title.trim().length > 0 && slugValid && !slugTaken && !submitting;

  // Auto-derive slug from title until the user types in the slug field.
  const [slugDirty, setSlugDirty] = useState(false);
  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugDirty) {
      setSlug(
        v
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60)
      );
    }
  }

  async function createPage() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/builder/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim().toLowerCase(),
          template_id: templateId,
        }),
      });
      const data = (await res.json()) as { page?: { id: string }; error?: string };
      if (!res.ok || !data.page) {
        throw new Error(data.error || `Failed (HTTP ${res.status})`);
      }
      onCreated(data.page.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
          <div>
            <h2 className="text-base font-black text-destiny-grey">
              {mode === "chooser" ? "Create a new page" : "Start from a template"}
            </h2>
            <p className="text-xs text-destiny-grey/50">
              {mode === "chooser"
                ? "Pick how you want to build it."
                : "Pick a starting layout, then name your page."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/50 hover:bg-black/5 hover:text-destiny-grey"
            aria-label="Close"
          >
            <span className="material-symbols-rounded text-base">close</span>
          </button>
        </div>

        {/* Chooser */}
        {mode === "chooser" && (
          <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
            <Link
              href="/admin/builder/skeleton"
              className="group flex flex-col rounded-xl border border-black/10 bg-white p-5 transition hover:border-destiny-orange/40 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destiny-orange/10">
                <span className="material-symbols-rounded text-xl text-destiny-orange">
                  auto_awesome
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-destiny-grey">
                Build with AI
              </h3>
              <p className="mt-1 text-xs text-destiny-grey/60">
                Sketch a skeleton, describe what you want, and AI ships a real
                code page to main.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-destiny-orange">
                Recommended
                <span className="material-symbols-rounded text-sm">
                  arrow_forward
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMode("template")}
              className="group flex flex-col rounded-xl border border-black/10 bg-white p-5 text-left transition hover:border-destiny-grey/40 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destiny-grey/10">
                <span className="material-symbols-rounded text-xl text-destiny-grey">
                  design_services
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-destiny-grey">
                Blank / template
              </h3>
              <p className="mt-1 text-xs text-destiny-grey/60">
                Build visually in the drag-and-drop editor. Stored in the DB —
                no code deploy needed.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/60">
                Open editor
                <span className="material-symbols-rounded text-sm">
                  arrow_forward
                </span>
              </span>
            </button>
          </div>
        )}

        {/* Template picker + name form */}
        {mode === "template" && (
          <div className="px-6 py-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-destiny-grey/50">
              Template
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((t) => {
                const active = templateId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-destiny-orange bg-destiny-orange/5 ring-2 ring-destiny-orange/20"
                        : "border-black/10 bg-white hover:border-black/20"
                    }`}
                  >
                    <span
                      className={`material-symbols-rounded text-lg ${
                        active ? "text-destiny-orange" : "text-destiny-grey/60"
                      }`}
                    >
                      {t.icon}
                    </span>
                    <span className="text-xs font-bold text-destiny-grey">
                      {t.name}
                    </span>
                    <span className="text-[11px] text-destiny-grey/50">
                      {t.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="title"
                  className="text-[11px] font-bold uppercase tracking-wider text-destiny-grey/50"
                >
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="e.g. Easter 2026"
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/10"
                />
              </div>
              <div>
                <label
                  htmlFor="slug"
                  className="text-[11px] font-bold uppercase tracking-wider text-destiny-grey/50"
                >
                  URL slug
                </label>
                <div className="mt-1 flex items-center rounded-lg border border-black/10 bg-white pl-3 focus-within:border-destiny-orange/50 focus-within:ring-2 focus-within:ring-destiny-orange/10">
                  <span className="font-mono text-xs text-destiny-grey/40">/</span>
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase());
                      setSlugDirty(true);
                    }}
                    placeholder="easter-2026"
                    className="w-full bg-transparent px-2 py-2 font-mono text-xs text-destiny-grey placeholder:text-destiny-grey/30 focus:outline-none"
                  />
                </div>
                {slug.trim() && !slugValid && (
                  <p className="mt-1 text-[11px] text-red-600">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                )}
                {slug.trim() && slugValid && slugTaken && (
                  <p className="mt-1 text-[11px] text-red-600">
                    A page with this slug already exists
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMode("chooser")}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
              >
                <span className="material-symbols-rounded text-base">
                  arrow_back
                </span>
                Back
              </button>
              <button
                type="button"
                onClick={createPage}
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destiny-orange px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-rounded animate-spin text-base">
                      progress_activity
                    </span>
                    Creating
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded text-base">
                      add
                    </span>
                    Create page
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}
