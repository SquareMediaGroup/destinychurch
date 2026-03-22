"use client";

import { useEffect, useState } from "react";

interface Banner {
  active: boolean;
  message: string;
  link: string;
  link_text: string;
}

export default function AdminBannerPage() {
  const [banner, setBanner] = useState<Banner>({ active: false, message: "", link: "", link_text: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/banner")
      .then((r) => r.json())
      .then((d) => {
        setBanner({
          active: d.active ?? false,
          message: d.message ?? "",
          link: d.link ?? "",
          link_text: d.link_text ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/banner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(banner),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pt-28">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-destiny-grey">Site Banner</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Display a sitewide announcement bar at the top of every page.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">progress_activity</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-6">

            {/* Preview */}
            {banner.active && banner.message && (
              <div className="flex items-center justify-center gap-3 rounded-2xl bg-destiny-orange px-6 py-3">
                <span className="material-symbols-rounded text-sm text-white/80">campaign</span>
                <p className="text-sm font-medium text-white">
                  {banner.message}
                  {banner.link && (
                    <span className="ml-2 font-bold underline underline-offset-2">
                      {banner.link_text || "Learn more"} →
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm flex flex-col gap-5">

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-destiny-grey">Show banner</p>
                  <p className="text-xs text-destiny-grey/50">Toggle the banner on or off sitewide</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBanner((b) => ({ ...b, active: !b.active }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    banner.active ? "bg-destiny-orange" : "bg-black/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      banner.active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-black/5" />

              {/* Message */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Message <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={banner.message}
                  onChange={(e) => setBanner((b) => ({ ...b, message: e.target.value }))}
                  placeholder="Service times are changing this Sunday…"
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                />
              </div>

              {/* Link */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                    Link URL <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={banner.link}
                    onChange={(e) => setBanner((b) => ({ ...b, link: e.target.value }))}
                    placeholder="/whats-on"
                    className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                    Link Text <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={banner.link_text}
                    onChange={(e) => setBanner((b) => ({ ...b, link_text: e.target.value }))}
                    placeholder="Find out more"
                    className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>
              </div>

            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110 disabled:opacity-60"
              >
                {saved ? (
                  <>
                    <span className="material-symbols-rounded text-base">check</span>
                    Saved
                  </>
                ) : saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
