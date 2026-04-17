"use client";

import { useEffect, useState } from "react";
import type { BannerType } from "@/contexts/BannerContext";

interface Banner {
  active: boolean;
  message: string;
  type: BannerType;
  link: string;
  link_text: string;
  custom_color: string;
}

const BRAND_ORANGE = "#f58021";

function getContrastColor(hex: string): "black" | "white" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? "black" : "white";
}

const TYPES: { value: BannerType; label: string; description: string; color: string; icon: string }[] = [
  {
    value: "announcement",
    label: "Announcement",
    description: "Highlighted in orange — for events, news or time-sensitive updates.",
    color: "bg-destiny-orange",
    icon: "campaign",
  },
  {
    value: "notice",
    label: "Notice",
    description: "Subtle grey bar — for general information or low-priority notices.",
    color: "bg-[#6b7280]",
    icon: "info",
  },
  {
    value: "sitewide",
    label: "Site-Wide Block",
    description: "Replaces the entire site with a maintenance screen. All visitors are blocked except /admin.",
    color: "bg-[#111]",
    icon: "build",
  },
];

export default function AdminBannerPage() {
  const [banner, setBanner] = useState<Banner>({
    active: false,
    message: "",
    type: "announcement",
    link: "",
    link_text: "",
    custom_color: "",
  });
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
          type: d.type ?? "announcement",
          link: d.link ?? "",
          link_text: d.link_text ?? "",
          custom_color: d.custom_color ?? "",
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

  const selectedType = TYPES.find((t) => t.value === banner.type) ?? TYPES[0];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-destiny-grey">Site Banner</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Display a sitewide announcement bar — or block the entire site for maintenance.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">progress_activity</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-6">

            {/* Live preview */}
            {banner.active && banner.message && (
              banner.type === "sitewide" ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#111] px-6 py-10 text-center">
                  <span className="material-symbols-rounded text-4xl text-white/20">build</span>
                  <p className="text-base font-black text-white">We'll be back soon</p>
                  <p className="text-sm text-white/60">{banner.message}</p>
                  {banner.link && (
                    <span className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white">
                      {banner.link_text || "Learn more"} →
                    </span>
                  )}
                  <p className="mt-3 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-400">
                    ⚠ This will block all visitors except /admin
                  </p>
                </div>
              ) : (() => {
                const isAnnouncement = banner.type === "announcement";
                const previewColor = isAnnouncement && banner.custom_color ? banner.custom_color : null;
                const textColor = previewColor ? getContrastColor(previewColor) : "white";
                return (
                  <div
                    className={`flex items-center justify-center gap-3 rounded-2xl px-6 py-3 ${previewColor ? "" : selectedType.color}`}
                    style={previewColor ? { backgroundColor: previewColor } : undefined}
                  >
                    <span className={`material-symbols-rounded text-sm ${textColor === "black" ? "text-black/80" : "text-white/80"}`}>{selectedType.icon}</span>
                    <p className={`text-sm font-medium ${textColor === "black" ? "text-black" : "text-white"}`}>
                      {banner.message}
                      {banner.link && (
                        <span className="ml-2 font-bold underline underline-offset-2">
                          {banner.link_text || "Learn more"} →
                        </span>
                      )}
                    </p>
                  </div>
                );
              })()
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

              {/* Banner type */}
              <div>
                <p className="mb-2 text-xs font-bold text-destiny-grey/60">Banner Type</p>
                <div className="flex flex-col gap-2">
                  {TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        banner.type === t.value
                          ? "border-destiny-orange/40 bg-destiny-orange/5"
                          : "border-black/8 hover:border-black/15"
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={t.value}
                        checked={banner.type === t.value}
                        onChange={() => setBanner((b) => ({ ...b, type: t.value }))}
                        className="mt-0.5 accent-destiny-orange"
                      />
                      <div className="flex flex-1 items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${t.color}`}
                        >
                          <span className="material-symbols-rounded text-base">{t.icon}</span>
                        </span>
                        <div>
                          <p className="text-sm font-bold text-destiny-grey">{t.label}</p>
                          <p className="text-xs leading-relaxed text-destiny-grey/50">{t.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom colour — announcement only */}
              {banner.type === "announcement" && (
                <>
                  <div className="h-px bg-black/5" />
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-destiny-grey/60">
                      Banner Colour <span className="font-normal">(optional — defaults to brand orange)</span>
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={banner.custom_color || BRAND_ORANGE}
                        onChange={(e) => setBanner((b) => ({ ...b, custom_color: e.target.value }))}
                        className="h-10 w-10 cursor-pointer rounded-lg border border-black/10 p-0.5"
                      />
                      <input
                        type="text"
                        value={banner.custom_color}
                        onChange={(e) => setBanner((b) => ({ ...b, custom_color: e.target.value }))}
                        placeholder={BRAND_ORANGE}
                        maxLength={7}
                        className="w-32 rounded-xl border border-black/10 px-4 py-2.5 font-mono text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                      />
                      {banner.custom_color && (
                        <button
                          type="button"
                          onClick={() => setBanner((b) => ({ ...b, custom_color: "" }))}
                          className="text-xs text-destiny-grey/40 hover:text-destiny-grey/70"
                        >
                          Reset to default
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

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
                  placeholder={
                    banner.type === "sitewide"
                      ? "We're carrying out scheduled maintenance. Back shortly."
                      : "Service times are changing this Sunday…"
                  }
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
