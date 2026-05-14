"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

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
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [pages, filter, search]);

  const draftPages = useMemo(
    () => filtered.filter((p) => p.status === "draft"),
    [filtered]
  );
  const otherPages = useMemo(
    () => filtered.filter((p) => p.status !== "draft"),
    [filtered]
  );

  const showDraftCards = filter === "all" || filter === "draft";
  const showList = filter === "all" || filter === "published" || filter === "archived";

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
                AI-generated pages on the site, plus draft pages still in progress.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/pages/skeleton"
                className="inline-flex items-center gap-1.5 rounded-lg bg-destiny-orange px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
              >
                <span className="material-symbols-rounded text-base">auto_awesome</span>
                New AI page
              </Link>
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

        {loading ? (
          <div className="space-y-6">
            {/* Draft card skeletons */}
            <div>
              <div className="mb-3 h-4 w-32 animate-pulse rounded bg-black/5" />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-64 animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]" />
                ))}
              </div>
            </div>
            <ul className="space-y-1.5">
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-14 animate-pulse rounded-lg border border-black/5 bg-white" />
              ))}
            </ul>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasSearch={Boolean(search) || filter !== "all"} />
        ) : (
          <div className="space-y-8">
            {/* Draft pages — card grid */}
            {showDraftCards && draftPages.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-destiny-grey/60">
                    Draft
                  </h2>
                  <span className="text-[10px] font-bold tabular-nums text-destiny-grey/35">
                    {draftPages.length}
                  </span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {draftPages.map((p) => (
                    <DraftPageCard key={p.id} page={p} onDelete={() => deletePage(p.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Published / archived — row list */}
            {showList && otherPages.length > 0 && (
              <div>
                {showDraftCards && draftPages.length > 0 && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-destiny-grey/60">
                      Published
                    </h2>
                    <span className="text-[10px] font-bold tabular-nums text-destiny-grey/35">
                      {otherPages.length}
                    </span>
                  </div>
                )}
                <ul className="overflow-hidden rounded-lg border border-black/5 bg-white">
                  {otherPages.map((p, i) => (
                    <PageRowItem
                      key={p.id}
                      page={p}
                      isLast={i === otherPages.length - 1}
                      onDelete={() => deletePage(p.id)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Draft page card (ChurchSuite-style) ─────────────────────────────────────

function DraftPageCard({ page, onDelete }: { page: PageRow; onDelete: () => void }) {
  const isCode = page.source_type === "code";
  const editHref = isCode ? `/admin/builder/code/${page.id}` : null;
  const updated = new Date(page.updated_at);

  const card = (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
      {/* Page screenshot thumbnail */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-[#f5f7fa]">
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ transform: "scale(0.25)", width: "1280px", height: "720px" }}
        >
          <iframe
            src={`/${page.slug}`}
            width={1280}
            height={720}
            className="border-0"
            tabIndex={-1}
            aria-hidden="true"
            loading="lazy"
          />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Draft badge */}
        <div className="absolute left-3 top-3">
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            Draft
          </div>
        </div>

        {/* Delete button (hover) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
          className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-destiny-grey/60 opacity-0 shadow-sm backdrop-blur-sm transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        >
          <span className="material-symbols-rounded text-base">delete</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 text-sm font-bold leading-snug text-destiny-grey line-clamp-2">
          {page.title}
        </h3>
        <p className="font-mono text-[11px] text-destiny-grey/45">/{page.slug}</p>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-[11px] text-destiny-grey/40">{formatRelative(updated)}</span>
          {editHref && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-destiny-orange transition-transform duration-200 group-hover:translate-x-0.5">
              <span>Edit page</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (editHref) {
    return <Link href={editHref}>{card}</Link>;
  }
  return <div>{card}</div>;
}

// ── Published/archived row item ──────────────────────────────────────────────

function PageRowItem({
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
  const isCode = page.source_type === "code";
  const editHref = isCode ? `/admin/builder/code/${page.id}` : null;

  const statusDot =
    page.status === "published"
      ? "bg-emerald-500"
      : page.status === "draft"
        ? "bg-amber-500"
        : "bg-destiny-grey/30";

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`h-2 w-2 flex-shrink-0 rounded-full ${statusDot}`}
        aria-label={page.status}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-destiny-grey">
            {page.title}
          </span>
        </div>
        <p className="truncate font-mono text-[11px] text-destiny-grey/45">
          /{page.slug}
        </p>
      </div>
      <span className="hidden flex-shrink-0 text-[11px] text-destiny-grey/40 sm:inline">
        {formatRelative(updated)}
      </span>
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
    </div>
  );

  return (
    <li className={`group relative ${isLast ? "" : "border-b border-black/5"}`}>
      {editHref ? (
        <Link href={editHref} className="block transition hover:bg-[#fafafa]">
          {inner}
        </Link>
      ) : (
        <div className="block">{inner}</div>
      )}
    </li>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
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
          : "Use AI to generate your first page."}
      </p>
      {!hasSearch && (
        <Link
          href="/admin/pages/skeleton"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-destiny-orange px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-sm">auto_awesome</span>
          Generate with AI
        </Link>
      )}
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
