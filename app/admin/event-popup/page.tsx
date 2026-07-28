"use client";

// Copy for the popup that advertises the featured event.
//
// Writes only the popup_* columns of the featured_event row — the target and
// hero copy belong to /admin/featured-event. The popup cannot be enabled
// without a featured event (the DB enforces it), so this page says so up front
// rather than letting the save fail.

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EventPopupPage() {
  const [featuredActive, setFeaturedActive] = useState(false);
  const [eventName, setEventName] = useState<string | null>(null);
  const [heroHeadline, setHeroHeadline] = useState<string | null>(null);

  const [popupActive, setPopupActive] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/featured-event");
        const row = await res.json();
        setFeaturedActive(Boolean(row.active));
        setEventName(row.event_name ?? null);
        setHeroHeadline(row.headline ?? null);
        setPopupActive(Boolean(row.popup_active));
        setTitle(row.popup_title ?? "");
        setBody(row.popup_body ?? "");
        setImageUrl(row.popup_image_url ?? null);
        setImagePath(row.popup_image_path ?? null);
        setCtaText(row.popup_cta_text ?? "");
        setCtaLink(row.popup_cta_link ?? "");
      } catch {
        setError("Couldn't load the event popup.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("prefix", "event-popup");
      const res = await fetch("/api/admin/popup/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
      setImagePath(data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/featured-event/popup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          popup_active: popupActive,
          popup_title: title,
          popup_body: body,
          popup_image_url: imageUrl,
          popup_image_path: imagePath,
          popup_cta_text: ctaText,
          popup_cta_link: ctaLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-destiny-grey">Event popup</h1>
        <p className="mt-1 text-sm text-destiny-grey/50">
          A popup advertising the featured event. It shows once per visit on
          every page except What&apos;s On and the event&apos;s own page, and it
          replaces the general{" "}
          <Link href="/admin/popup" className="font-bold text-destiny-orange">
            site popup
          </Link>{" "}
          while it&apos;s live.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-black/8 bg-[#f5f7fa] px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
          Currently featured
        </p>
        {featuredActive && eventName ? (
          <p className="mt-1 text-sm font-black text-destiny-grey">
            {heroHeadline || eventName}
          </p>
        ) : (
          <p className="mt-1 text-sm text-destiny-grey/60">
            Nothing is being promoted yet. The popup advertises whichever event
            is featured, so{" "}
            <Link
              href="/admin/featured-event"
              className="font-bold text-destiny-orange"
            >
              choose one first
            </Link>
            .
          </p>
        )}
      </div>

      <div className="space-y-5 rounded-2xl border border-black/8 bg-white p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={popupActive}
            disabled={!featuredActive}
            onChange={(e) => setPopupActive(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#f58021] disabled:opacity-40"
          />
          <span>
            <span className="block text-sm font-bold text-destiny-grey">
              Show the popup
            </span>
            <span className="block text-xs text-destiny-grey/50">
              Shows once per visit. Editing anything here shows it again to
              everyone.
            </span>
          </span>
        </label>

        <div>
          <label
            htmlFor="popup-title"
            className="block text-xs font-bold text-destiny-grey/60"
          >
            Title
          </label>
          <input
            id="popup-title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={heroHeadline || eventName || "Featured event headline"}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-destiny-orange"
          />
        </div>

        <div>
          <label
            htmlFor="popup-body"
            className="block text-xs font-bold text-destiny-grey/60"
          >
            Message
          </label>
          <textarea
            id="popup-body"
            value={body}
            maxLength={600}
            rows={4}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Falls back to the featured event's blurb"
            className="mt-1 w-full resize-y rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-destiny-orange"
          />
        </div>

        <div>
          <span className="block text-xs font-bold text-destiny-grey/60">
            Image
          </span>
          {imageUrl ? (
            <div className="mt-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className="aspect-[16/9] w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setImageUrl(null);
                  setImagePath(null);
                }}
                className="mt-2 text-xs font-bold text-red-600"
              >
                Remove image
              </button>
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-destiny-grey/40">
              Using the featured event&apos;s image.
            </p>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="mt-2 block w-full text-xs text-destiny-grey/60 file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5f7fa] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-destiny-grey"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="popup-cta-text"
              className="block text-xs font-bold text-destiny-grey/60"
            >
              Button text
            </label>
            <input
              id="popup-cta-text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="Sign up"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-destiny-orange"
            />
          </div>
          <div>
            <label
              htmlFor="popup-cta-link"
              className="block text-xs font-bold text-destiny-grey/60"
            >
              Button link
            </label>
            <input
              id="popup-cta-link"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
              placeholder="Featured event's link"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-destiny-orange"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-destiny-orange px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
