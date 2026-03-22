"use client";

import { useEffect, useState, useCallback } from "react";

interface Redirect {
  id: string;
  slug: string;
  target_url: string;
  label: string | null;
  active: boolean;
  created_at: string;
}

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
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
      await fetchRedirects();
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
    }
    setCreating(false);
  }

  async function handleToggle(r: Redirect) {
    await fetch(`/api/admin/redirects/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    setRedirects((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, active: !r.active } : x))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this redirect?")) return;
    await fetch(`/api/admin/redirects/${id}`, { method: "DELETE" });
    setRedirects((prev) => prev.filter((x) => x.id !== id));
  }

  function handleCopy(slug: string) {
    navigator.clipboard.writeText(`https://destinytees.uk/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  // Auto-format slug from label
  function handleLabelChange(val: string) {
    setLabel(val);
    if (!slug) {
      setSlug(val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pt-28">
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-destiny-grey">Redirects</h1>
        <p className="mt-1 text-sm text-destiny-grey/50">
          Create vanity URLs that redirect to any destination.
        </p>
      </div>

      {/* Create form */}
      <div className="mb-8 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
          New Redirect
        </h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                Label <span className="font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g. Alpha Sign Up"
                className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                Slug <span className="text-red-400">*</span>
              </label>
              <div className="flex rounded-xl border border-black/10 overflow-hidden focus-within:border-destiny-orange/50 focus-within:ring-2 focus-within:ring-destiny-orange/20">
                <span className="flex items-center bg-black/5 px-3 text-xs text-destiny-grey/40 border-r border-black/10 whitespace-nowrap">
                  destinytees.uk/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
                  }
                  required
                  placeholder="alpha-signup"
                  className="flex-1 min-w-0 px-3 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
              Target URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              required
              placeholder="https://destinytees.churchsuite.com/..."
              className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110 disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create redirect"}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-black/5 px-6 py-4">
          <p className="text-sm font-bold text-destiny-grey">
            {redirects.length} redirect{redirects.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
              progress_activity
            </span>
          </div>
        ) : redirects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-rounded mb-3 text-4xl text-destiny-grey/20">link_off</span>
            <p className="text-sm font-bold text-destiny-grey/40">No redirects yet</p>
            <p className="text-xs text-destiny-grey/30">Create your first redirect above</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {redirects.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-4 px-6 py-4 transition ${!r.active ? "opacity-50" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-destiny-grey">
                      /{r.slug}
                    </span>
                    {r.label && (
                      <span className="rounded-full bg-destiny-orange/10 px-2 py-0.5 text-[10px] font-bold text-destiny-orange">
                        {r.label}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-destiny-grey/40">{r.target_url}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Copy */}
                  <button
                    onClick={() => handleCopy(r.slug)}
                    title="Copy URL"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-grey"
                  >
                    <span className="material-symbols-rounded text-base">
                      {copied === r.slug ? "check" : "content_copy"}
                    </span>
                  </button>

                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggle(r)}
                    title={r.active ? "Deactivate" : "Activate"}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      r.active ? "bg-destiny-orange" : "bg-black/10"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        r.active ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(r.id)}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/30 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <span className="material-symbols-rounded text-base">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
