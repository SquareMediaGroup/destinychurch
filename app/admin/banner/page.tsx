"use client";

import { useEffect, useState } from "react";
import type { BannerType } from "@/contexts/BannerContext";
import { getNextAlphaSession } from "@/lib/alphaSession";

interface Banner {
  active: boolean;
  message: string;
  type: BannerType;
  link: string;
  link_text: string;
}

interface ActiveAlpha {
  start_date: string;
  signup_url: string;
  frequency: string;
  custom_interval_days: number | null;
}

const TYPES: {
  value: BannerType;
  label: string;
  description: string;
  color: string;
  icon: string;
}[] = [
  {
    value: "announcement",
    label: "Announcement",
    description:
      "Highlighted in orange — for events, news or time-sensitive updates.",
    color: "bg-destiny-orange",
    icon: "campaign",
  },
  {
    value: "alpha",
    label: "Alpha",
    description:
      "Deep-red bar that auto-pulls from the active Alpha event. Date updates as sessions pass.",
    color: "bg-[#3a0606]",
    icon: "auto_awesome",
  },
  {
    value: "notice",
    label: "Notice",
    description:
      "Subtle grey bar — for general information or low-priority notices.",
    color: "bg-[#6b7280]",
    icon: "info",
  },
  {
    value: "sitewide",
    label: "Site-Wide Block",
    description:
      "Replaces the entire site with a maintenance screen. All visitors are blocked except /admin.",
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
  });
  const [alpha, setAlpha] = useState<ActiveAlpha | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/banner").then((r) => r.json()),
      fetch("/api/admin/alpha-events").then((r) => r.json()),
    ])
      .then(([b, events]) => {
        setBanner({
          active: b.active ?? false,
          message: b.message ?? "",
          type: b.type ?? "announcement",
          link: b.link ?? "",
          link_text: b.link_text ?? "",
        });
        if (Array.isArray(events)) {
          const active = events.find(
            (e) => e.type === "alpha" && e.active
          );
          setAlpha(active ?? null);
        }
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
  const isAlpha = banner.type === "alpha";
  const isSitewide = banner.type === "sitewide";

  const alphaPreview = alpha
    ? (() => {
        const { date, isFirst } = getNextAlphaSession(
          alpha.start_date,
          alpha.frequency,
          alpha.custom_interval_days
        );
        return {
          dateLabel: date.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "long",
          }),
          cadenceLabel: isFirst ? "Starting" : "Next session",
        };
      })()
    : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-destiny-grey">Site Banner</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Display a sitewide announcement bar — or block the entire site for
            maintenance.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
              progress_activity
            </span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            {/* Live preview */}
            {banner.active && (isAlpha ? !!alphaPreview : !!banner.message) && (
              isSitewide ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#111] px-6 py-10 text-center">
                  <span className="material-symbols-rounded text-4xl text-white/20">build</span>
                  <p className="text-base font-black text-white">We&apos;ll be back soon</p>
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
              ) : isAlpha ? (
                <div
                  className="flex h-10 items-center justify-center gap-3 rounded-2xl px-6"
                  style={{
                    background:
                      "linear-gradient(90deg, #2a0404 0%, #3a0606 50%, #2a0404 100%)",
                  }}
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.32em] text-destiny-orange">
                    {banner.message?.trim() || "Alpha"}
                  </span>
                  <span className="h-3 w-px bg-white/20" />
                  <p className="text-sm font-medium text-white/90">
                    {alphaPreview?.cadenceLabel}{" "}
                    <span
                      className="italic font-normal text-white"
                      style={{
                        fontFamily: "var(--font-playfair), Georgia, serif",
                      }}
                    >
                      {alphaPreview?.dateLabel}
                    </span>
                  </p>
                  <span className="text-sm font-bold text-destiny-orange">
                    {banner.link_text || "Sign up"} →
                  </span>
                </div>
              ) : (
                <div
                  className={`flex items-center justify-center gap-3 rounded-2xl px-6 py-3 ${selectedType.color}`}
                >
                  <span className="material-symbols-rounded text-sm text-white/80">
                    {selectedType.icon}
                  </span>
                  <p className="text-sm font-medium text-white">
                    {banner.message}
                    {banner.link && (
                      <span className="ml-2 font-bold underline underline-offset-2">
                        {banner.link_text || "Learn more"} →
                      </span>
                    )}
                  </p>
                </div>
              )
            )}

            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm flex flex-col gap-5">
              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-destiny-grey">Show banner</p>
                  <p className="text-xs text-destiny-grey/50">
                    Toggle the banner on or off sitewide
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBanner((b) => ({ ...b, active: !b.active }))
                  }
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
                <p className="mb-2 text-xs font-bold text-destiny-grey/60">
                  Banner Type
                </p>
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
                        onChange={() =>
                          setBanner((b) => ({ ...b, type: t.value }))
                        }
                        className="mt-0.5 accent-destiny-orange"
                      />
                      <div className="flex flex-1 items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${t.color}`}
                        >
                          <span className="material-symbols-rounded text-base">
                            {t.icon}
                          </span>
                        </span>
                        <div>
                          <p className="text-sm font-bold text-destiny-grey">
                            {t.label}
                          </p>
                          <p className="text-xs leading-relaxed text-destiny-grey/50">
                            {t.description}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="h-px bg-black/5" />

              {isAlpha ? (
                <div className="rounded-xl border border-dashed border-[#3a0606]/30 bg-[#3a0606]/[0.04] p-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#3a0606]">
                    Auto-populated from Alpha
                  </p>
                  {alpha ? (
                    <p className="text-sm text-destiny-grey/70">
                      Pulling from your active Alpha event ({alphaPreview?.cadenceLabel.toLowerCase()}{" "}
                      <strong>{alphaPreview?.dateLabel}</strong>). Date advances
                      automatically each {alpha.frequency.replace("_", " ")} as
                      sessions pass. Edit details under{" "}
                      <a
                        href="/admin/alpha"
                        className="font-bold text-[#3a0606] underline underline-offset-2"
                      >
                        Alpha events
                      </a>
                      .
                    </p>
                  ) : (
                    <p className="text-sm text-destiny-grey/70">
                      No active Alpha event yet. The banner will stay hidden
                      until you{" "}
                      <a
                        href="/admin/alpha"
                        className="font-bold text-[#3a0606] underline underline-offset-2"
                      >
                        create one
                      </a>
                      .
                    </p>
                  )}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                        Eyebrow{" "}
                        <span className="font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={banner.message}
                        onChange={(e) =>
                          setBanner((b) => ({ ...b, message: e.target.value }))
                        }
                        placeholder="Alpha"
                        className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                        CTA label{" "}
                        <span className="font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={banner.link_text}
                        onChange={(e) =>
                          setBanner((b) => ({
                            ...b,
                            link_text: e.target.value,
                          }))
                        }
                        placeholder="Sign up"
                        className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                      CTA link{" "}
                      <span className="font-normal">(default /alpha)</span>
                    </label>
                    <input
                      type="text"
                      value={banner.link}
                      onChange={(e) =>
                        setBanner((b) => ({ ...b, link: e.target.value }))
                      }
                      placeholder="/alpha"
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Message */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={banner.message}
                      onChange={(e) =>
                        setBanner((b) => ({ ...b, message: e.target.value }))
                      }
                      placeholder={
                        isSitewide
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
                        onChange={(e) =>
                          setBanner((b) => ({ ...b, link: e.target.value }))
                        }
                        placeholder="/whats-on"
                        className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                        Link Text{" "}
                        <span className="font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={banner.link_text}
                        onChange={(e) =>
                          setBanner((b) => ({
                            ...b,
                            link_text: e.target.value,
                          }))
                        }
                        placeholder="Find out more"
                        className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110 disabled:opacity-60"
              >
                {saved ? (
                  <>
                    <span className="material-symbols-rounded text-base">
                      check
                    </span>
                    Saved
                  </>
                ) : saving ? (
                  "Saving…"
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
