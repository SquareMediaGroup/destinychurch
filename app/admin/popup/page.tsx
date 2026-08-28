"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Popup {
  active: boolean;
  title: string;
  body: string;
  cta_text: string;
  cta_link: string;
  image_url: string | null;
  image_path: string | null;
  show_once: boolean;
}

const EMPTY: Popup = {
  active: false,
  title: "",
  body: "",
  cta_text: "",
  cta_link: "",
  image_url: null,
  image_path: null,
  show_once: true,
};

const MAX_BYTES = 50 * 1024 * 1024;

export default function AdminPopupPage() {
  const [popup, setPopup] = useState<Popup>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/popup")
      .then((r) => r.json())
      .then((p) =>
        setPopup({
          active: p.active ?? false,
          title: p.title ?? "",
          body: p.body ?? "",
          cta_text: p.cta_text ?? "",
          cta_link: p.cta_link ?? "",
          image_url: p.image_url ?? null,
          image_path: p.image_path ?? null,
          show_once: p.show_once ?? true,
        })
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > MAX_BYTES) {
      setError("Image must be 50 MB or smaller.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/popup/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setPopup((p) => ({
          ...p,
          image_url: data.url,
          image_path: data.path,
        }));
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function clearImage() {
    setPopup((p) => ({ ...p, image_url: null, image_path: null }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/popup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(popup),
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-destiny-grey">Site Popup</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Show a one-time popup with an image, message and call-to-action.
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
            {popup.active && (popup.title || popup.body || popup.image_url) && (
              <div className="rounded-2xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-destiny-grey/40">
                  Preview
                </p>
                <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-destiny-grey-800 dark:ring-white/10">
                  {popup.image_url && (
                    <div className="relative aspect-[16/9] w-full bg-[#f5f7fa]">
                      <Image
                        src={popup.image_url}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-3 p-6">
                    {popup.title && (
                      <h2 className="text-xl font-black text-destiny-grey">
                        {popup.title}
                      </h2>
                    )}
                    {popup.body && (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-destiny-grey/70">
                        {popup.body}
                      </p>
                    )}
                    {popup.cta_text && (
                      <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white">
                        {popup.cta_text}
                        <span className="material-symbols-rounded text-base">
                          arrow_forward
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-6 shadow-sm flex flex-col gap-5">
              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-destiny-grey">
                    Show popup
                  </p>
                  <p className="text-xs text-destiny-grey/50">
                    Display this popup to all visitors
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPopup((p) => ({ ...p, active: !p.active }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    popup.active ? "bg-destiny-orange" : "bg-black/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      popup.active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-black/5" />

              {/* Show once toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-destiny-grey">
                    Show once per session
                  </p>
                  <p className="text-xs text-destiny-grey/50">
                    If on, the popup only shows once per browser session
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPopup((p) => ({ ...p, show_once: !p.show_once }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    popup.show_once ? "bg-destiny-orange" : "bg-black/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      popup.show_once ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-black/5" />

              {/* Image */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Image <span className="font-normal">(up to 50 MB)</span>
                </label>
                {popup.image_url ? (
                  <div className="relative overflow-hidden rounded-xl border border-black/5 bg-[#f5f7fa]">
                    <div className="relative aspect-[16/9] w-full">
                      <Image
                        src={popup.image_url}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                      aria-label="Remove image"
                    >
                      <span className="material-symbols-rounded text-base">
                        close
                      </span>
                    </button>
                  </div>
                ) : (
                  <label
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
                      uploading
                        ? "border-destiny-orange/40 bg-destiny-orange/5"
                        : "border-black/15 hover:border-destiny-orange/40 hover:bg-destiny-orange/[0.03]"
                    }`}
                  >
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={handleFile}
                      disabled={uploading}
                      className="hidden"
                    />
                    <span className="material-symbols-rounded text-3xl text-destiny-grey/40">
                      {uploading ? "progress_activity" : "add_photo_alternate"}
                    </span>
                    <p className="text-sm font-bold text-destiny-grey">
                      {uploading ? "Uploading…" : "Click to upload"}
                    </p>
                    <p className="text-xs text-destiny-grey/50">
                      PNG, JPG, WEBP, GIF or SVG · max 50 MB
                    </p>
                  </label>
                )}
              </div>

              <div className="h-px bg-black/5" />

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Title <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={popup.title}
                  onChange={(e) =>
                    setPopup((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Welcome to Destiny Church"
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                />
              </div>

              {/* Body */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Message <span className="font-normal">(optional)</span>
                </label>
                <textarea
                  value={popup.body}
                  onChange={(e) =>
                    setPopup((p) => ({ ...p, body: e.target.value }))
                  }
                  rows={4}
                  placeholder="Tell visitors what's on, why it matters, and what to do next."
                  className="w-full resize-none rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                />
              </div>

              {/* CTA */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                    CTA Text <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={popup.cta_text}
                    onChange={(e) =>
                      setPopup((p) => ({ ...p, cta_text: e.target.value }))
                    }
                    placeholder="Find out more"
                    className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                    CTA Link <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={popup.cta_link}
                    onChange={(e) =>
                      setPopup((p) => ({ ...p, cta_link: e.target.value }))
                    }
                    placeholder="/visit"
                    className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || uploading}
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
