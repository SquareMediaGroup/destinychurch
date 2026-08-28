"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useDialog } from "@/components/DialogProvider";
import {
  PageHeader,
  EmptyState,
  ErrorNote,
  ListToolbar,
  FilterChips,
  TableSkeleton,
  Toggle,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/AdminUI";
import { useAdminList } from "@/lib/useAdminList";
import { RedirectQrModal } from "@/components/admin/redirects/RedirectQrModal";
import type { EngagementRollup } from "@/lib/engagement";

interface Redirect {
  id: string;
  slug: string;
  target_url: string;
  label: string | null;
  active: boolean;
  created_at: string;
}

export default function RedirectsPage() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  // The create form used to sit permanently above the list, pushing every
  // existing redirect below the fold. It now opens on demand.
  const [showForm, setShowForm] = useState(false);
  const [qrTarget, setQrTarget] = useState<Redirect | null>(null);
  // 30-day click counts, keyed by slug. Fetched separately rather than joined
  // onto the row: a counter column on `redirects` would drift from the click
  // log and give two different answers to "how many clicks", so the count
  // shown here always comes from the same engagement_events data the
  // Analytics page reads. Both routes require site_admin, so a caller who can
  // see this page can always reach the other.
  const [clickCounts, setClickCounts] = useState<Record<string, number> | null>(null);

  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [targetUrl, setTargetUrl] = useState("");

  const fetchRedirects = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/redirects");
      const data = await res.json();
      setRedirects(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) && data?.error) {
        setError(`Database error: ${data.error}`);
      }
    } catch {
      setRedirects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRedirects();
  }, [fetchRedirects]);

  useEffect(() => {
    fetch("/api/admin/analytics?source=redirect&range=month")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: EngagementRollup | null) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        for (const row of data.byTarget) counts[row.key] = row.events;
        setClickCounts(counts);
      })
      // Not fatal — the page works fine without click counts, they just
      // don't show. Most likely cause is the migration not being applied yet.
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowForm(true);
  }, [searchParams]);

  const list = useAdminList<Redirect>({
    items: redirects,
    searchKeys: [
      { name: "slug", weight: 0.4 },
      { name: "label", weight: 0.4 },
      { name: "target_url", weight: 0.2 },
    ],
    filters: [
      {
        key: "state",
        options: [
          { value: "active", label: "Active" },
          { value: "off", label: "Off" },
        ],
        match: (r, value) => (value === "active" ? r.active : !r.active),
      },
    ],
    sorts: {
      slug: (a, b) => a.slug.localeCompare(b.slug),
      created: (a, b) => a.created_at.localeCompare(b.created_at),
    },
    defaultSort: { field: "created", direction: "desc" },
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const res = await fetch("/api/admin/redirects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, target_url: targetUrl, label: label || null }),
    });
    if (res.ok) {
      setLabel("");
      setSlug("");
      setTargetUrl("");
      setShowForm(false);
      await fetchRedirects();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong");
    }
    setCreating(false);
  }

  async function handleToggle(r: Redirect) {
    // Optimistic — the toggle should feel instant; roll back if the write fails.
    setRedirects((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, active: !r.active } : x)),
    );
    const res = await fetch(`/api/admin/redirects/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    if (!res.ok) {
      setError("Could not change that redirect. Reloading the list.");
      fetchRedirects();
    }
  }

  async function handleDelete(r: Redirect) {
    if (
      !(await confirm({
        title: "Delete redirect",
        message: `Delete /${r.slug}? Anyone using that link will get a 404.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`/api/admin/redirects/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete that redirect.");
      return;
    }
    setRedirects((prev) => prev.filter((x) => x.id !== r.id));
  }

  function handleCopy(slug: string) {
    navigator.clipboard.writeText(`https://destinytees.uk/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleLabelChange(val: string) {
    setLabel(val);
    if (!slug) {
      setSlug(val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Redirects"
        subtitle="Vanity URLs on destinytees.uk that point anywhere — print one on a flyer and change where it goes later."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          <button className={primaryBtn} onClick={() => setShowForm((s) => !s)}>
            <span className="material-symbols-rounded text-lg">
              {showForm ? "close" : "add"}
            </span>
            {showForm ? "Cancel" : "New redirect"}
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {showForm && (
        <div className="mb-8 rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
            New redirect
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="redirect-label">
                  Label (optional)
                </label>
                <input
                  id="redirect-label"
                  type="text"
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="e.g. Alpha Sign Up"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="redirect-slug">
                  Slug (required)
                </label>
                <div className="flex overflow-hidden rounded-xl border border-black/10 focus-within:border-destiny-orange/50 focus-within:ring-2 focus-within:ring-destiny-orange/15">
                  <span className="flex items-center whitespace-nowrap border-r border-black/10 bg-black/5 px-3 text-xs text-destiny-grey/40">
                    destinytees.uk/
                  </span>
                  <input
                    id="redirect-slug"
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    required
                    placeholder="alpha-signup"
                    className="min-w-0 flex-1 px-3 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="redirect-target">
                Target URL (required)
              </label>
              <input
                id="redirect-target"
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
                placeholder="https://destinytees.churchsuite.com/..."
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className={ghostBtn} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={creating} className={primaryBtn}>
                {creating ? "Creating…" : "Create redirect"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <TableSkeleton columns={3} />
      ) : redirects.length === 0 ? (
        <EmptyState
          icon="link_off"
          title="No redirects yet"
          hint="Create a short link like destinytees.uk/alpha that you can repoint whenever the sign-up form moves."
          action={
            <button className={primaryBtn} onClick={() => setShowForm(true)}>
              <span className="material-symbols-rounded text-lg">add</span>
              New redirect
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search slug, label or target"
            noun="redirect"
            total={list.total}
            shown={list.shown}
            filters={
              <FilterChips
                label="State"
                options={list.filterOptions("state")}
                value={list.filterValues.state}
                onChange={(v) => list.setFilter("state", v)}
              />
            }
          />

          {list.visible.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No redirects match"
              hint="Try part of the slug, the label, or the destination."
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
            <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
              <div className="divide-y divide-black/5">
                {list.visible.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-4 px-5 py-4 transition ${
                      r.active ? "" : "opacity-55"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-destiny-grey">/{r.slug}</span>
                        {r.label && (
                          <span className="rounded-full bg-destiny-orange/10 px-2 py-0.5 text-[10px] font-bold text-destiny-orange">
                            {r.label}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-destiny-grey/45">{r.target_url}</p>
                      {clickCounts && (clickCounts[r.slug] ?? 0) > 0 && (
                        <a
                          href={`/admin/analytics?tab=links&range=month&target=${encodeURIComponent(r.slug)}`}
                          className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-destiny-grey/40 transition hover:text-destiny-orange"
                        >
                          <span className="material-symbols-rounded text-sm">ads_click</span>
                          {clickCounts[r.slug]} click{clickCounts[r.slug] === 1 ? "" : "s"} in the
                          last 30 days
                        </a>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={`https://destinytees.uk/${r.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open this link"
                        aria-label={`Open /${r.slug}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-orange"
                      >
                        <span className="material-symbols-rounded text-base">open_in_new</span>
                      </a>
                      <button
                        onClick={() => handleCopy(r.slug)}
                        title="Copy URL"
                        aria-label={`Copy the URL for /${r.slug}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-grey"
                      >
                        <span
                          className={`material-symbols-rounded text-base ${
                            copied === r.slug ? "text-destiny-green" : ""
                          }`}
                        >
                          {copied === r.slug ? "check" : "content_copy"}
                        </span>
                      </button>
                      <button
                        onClick={() => setQrTarget(r)}
                        title="QR code"
                        aria-label={`Get a QR code for /${r.slug}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-grey"
                      >
                        <span className="material-symbols-rounded text-base">qr_code_2</span>
                      </button>
                      <Toggle
                        checked={r.active}
                        onChange={() => handleToggle(r)}
                        label={r.active ? `Deactivate /${r.slug}` : `Activate /${r.slug}`}
                      />
                      <button
                        onClick={() => handleDelete(r)}
                        title="Delete"
                        aria-label={`Delete /${r.slug}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/30 transition hover:bg-destiny-red/10 hover:text-destiny-red"
                      >
                        <span className="material-symbols-rounded text-base">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {qrTarget && (
        <RedirectQrModal
          slug={qrTarget.slug}
          label={qrTarget.label}
          onClose={() => setQrTarget(null)}
        />
      )}
    </div>
  );
}
