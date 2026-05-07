"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
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

  useEffect(() => {
    fetch("/api/admin/builder/pages")
      .then((r) => r.json())
      .then((d) => setPages(d.pages || []))
      .finally(() => setLoading(false));
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
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-black/5 bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 0% 0%, rgba(245,128,33,0.08), transparent 50%), radial-gradient(circle at 100% 100%, rgba(245,128,33,0.06), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-16">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-destiny-orange">
            <span className="h-1.5 w-1.5 rounded-full bg-destiny-orange" />
            Page Builder
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-destiny-grey md:text-5xl">
            Build pages with{" "}
            <span className="bg-gradient-to-r from-destiny-orange to-amber-500 bg-clip-text text-transparent">
              AI
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-destiny-grey/60">
            Describe what you want and AI writes a real Next.js page, type-checks
            it, commits to <code className="rounded bg-destiny-grey/5 px-1.5 py-0.5 font-mono text-sm">main</code>, and emails an audit.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/admin/builder/ai"
              className="group inline-flex items-center gap-2 rounded-2xl bg-destiny-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-destiny-orange/40"
            >
              <span className="material-symbols-rounded text-lg">auto_awesome</span>
              Create page with AI
              <span className="material-symbols-rounded text-base transition group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
            >
              <span className="material-symbols-rounded text-lg">arrow_back</span>
              Back to admin
            </Link>
          </div>

          {/* Stat cards */}
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total pages" value={counts.all} accent="grey" />
            <StatCard label="Published" value={counts.published} accent="green" />
            <StatCard label="Drafts" value={counts.draft} accent="amber" />
            <StatCard label="Archived" value={counts.archived} accent="grey" />
          </div>
        </div>
      </div>

      {/* List section */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "published", "draft", "archived"] as FilterKey[]).map(
              (k) => {
                const active = filter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilter(k)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold capitalize transition ${
                      active
                        ? "bg-destiny-grey text-white shadow-sm"
                        : "bg-white text-destiny-grey/60 hover:bg-[#f5f7fa]"
                    }`}
                  >
                    {k}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        active ? "bg-white/20" : "bg-destiny-grey/10"
                      }`}
                    >
                      {counts[k]}
                    </span>
                  </button>
                );
              }
            )}
          </div>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-rounded pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-destiny-grey/30">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages…"
              className="w-full rounded-xl border border-black/5 bg-white px-9 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/10"
            />
          </div>
        </div>

        {/* Pages grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-black/5 bg-white"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasSearch={Boolean(search) || filter !== "all"} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PageCard key={p.id} page={p} onDelete={() => deletePage(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "grey" | "green" | "amber";
}) {
  const dot =
    accent === "green"
      ? "bg-green-500"
      : accent === "amber"
        ? "bg-amber-500"
        : "bg-destiny-grey/40";

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-destiny-grey/50">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-black text-destiny-grey">{value}</div>
    </div>
  );
}

function PageCard({
  page,
  onDelete,
}: {
  page: PageRow;
  onDelete: () => void;
}) {
  const updated = new Date(page.updated_at);
  const isPublished = page.status === "published";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      {/* Preview thumbnail (gradient placeholder) */}
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,128,33,0.12), rgba(245,128,33,0.04) 60%, #f5f7fa)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-rounded text-5xl text-destiny-orange/20">
            description
          </span>
        </div>
        <div className="absolute left-3 top-3">
          <StatusPill status={page.status} />
        </div>
        {isPublished && (
          <a
            href={`/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View live"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-destiny-grey shadow-sm transition hover:bg-white"
          >
            <span className="material-symbols-rounded text-base">open_in_new</span>
          </a>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-bold text-destiny-grey">
          {page.title}
        </h3>
        <p className="mt-1 truncate font-mono text-xs text-destiny-grey/50">
          /{page.slug}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
          <span className="flex items-center gap-1.5 text-[11px] text-destiny-grey/50">
            <span className="material-symbols-rounded text-sm">schedule</span>
            {formatRelative(updated)}
          </span>

          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <Link
              href={`/admin/builder/${page.id}/preview`}
              title="Preview"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/60 hover:bg-[#f5f7fa]"
            >
              <span className="material-symbols-rounded text-base">visibility</span>
            </Link>
            <button
              type="button"
              onClick={onDelete}
              title="Delete"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/60 hover:bg-red-50 hover:text-red-600"
            >
              <span className="material-symbols-rounded text-base">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: PageRow["status"] }) {
  const config =
    status === "published"
      ? { bg: "bg-green-500/95", text: "text-white", label: "Published" }
      : status === "draft"
        ? { bg: "bg-amber-500/95", text: "text-white", label: "Draft" }
        : { bg: "bg-destiny-grey/80", text: "text-white", label: "Archived" };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text} backdrop-blur`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
      {config.label}
    </span>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-black/10 bg-white py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10">
        <span className="material-symbols-rounded text-3xl text-destiny-orange">
          {hasSearch ? "search_off" : "auto_awesome"}
        </span>
      </div>
      <h3 className="mt-5 text-lg font-bold text-destiny-grey">
        {hasSearch ? "No matching pages" : "No pages yet"}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-destiny-grey/50">
        {hasSearch
          ? "Try a different filter or search term."
          : "Get started by describing the page you want — AI will build it."}
      </p>
      {!hasSearch && (
        <Link
          href="/admin/builder/ai"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-base">auto_awesome</span>
          Create your first page
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
