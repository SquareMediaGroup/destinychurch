"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ShopHeroSlide } from "@/lib/shop";

const MAX_BYTES = 10 * 1024 * 1024;

export default function AdminShopHeroPage() {
  const [slides, setSlides] = useState<ShopHeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/shop-hero")
      .then((r) => r.json())
      .then((data) => setSlides(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load slides"))
      .finally(() => setLoading(false));
  }, []);

  async function addSlide() {
    setError("");
    const res = await fetch("/api/admin/shop-hero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true, heading: "" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not add slide");
      return;
    }
    setSlides((s) => [...s, data]);
  }

  function patchLocal(id: string, patch: Partial<ShopHeroSlide>) {
    setSlides((s) => s.map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)));
  }

  async function saveSlide(slide: ShopHeroSlide) {
    const res = await fetch(`/api/admin/shop-hero/${slide.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        active: slide.active,
        heading: slide.heading,
        subheading: slide.subheading,
        cta_text: slide.cta_text,
        cta_link: slide.cta_link,
        image_url: slide.image_url,
        image_path: slide.image_path,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? "Save failed");
    }
  }

  async function deleteSlide(id: string) {
    setError("");
    const res = await fetch(`/api/admin/shop-hero/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Delete failed");
      return;
    }
    setSlides((s) => s.filter((sl) => sl.id !== id));
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const a = slides[index];
    const b = slides[target];
    // Swap sort_order and persist both, then reorder locally.
    const aOrder = a.sort_order;
    const bOrder = b.sort_order;
    setError("");
    await Promise.all([
      fetch(`/api/admin/shop-hero/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: bOrder }),
      }),
      fetch(`/api/admin/shop-hero/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: aOrder }),
      }),
    ]);
    setSlides((s) => {
      const next = [...s];
      next[index] = { ...b, sort_order: aOrder };
      next[target] = { ...a, sort_order: bOrder };
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-destiny-grey">Shop Hero</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Slides shown at the top of the shop. Two or more active slides rotate
            automatically. With none active, the shop shows its default heading.
          </p>
        </div>
        <button
          type="button"
          onClick={addSlide}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-base">add</span>
          Add slide
        </button>
      </div>

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
            progress_activity
          </span>
        </div>
      ) : slides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center dark:border-white/15 dark:bg-destiny-grey-800">
          <span className="material-symbols-rounded text-4xl text-destiny-grey/25">
            wallpaper
          </span>
          <p className="mt-3 text-sm font-bold text-destiny-grey">
            No slides yet
          </p>
          <p className="mt-1 text-xs text-destiny-grey/50">
            Add a slide to replace the default shop heading with a hero.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {slides.map((slide, i) => (
            <SlideCard
              key={slide.id}
              slide={slide}
              index={i}
              total={slides.length}
              onChange={(patch) => patchLocal(slide.id, patch)}
              onSave={() => saveSlide(slide)}
              onDelete={() => deleteSlide(slide.id)}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlideCard({
  slide,
  index,
  total,
  onChange,
  onSave,
  onDelete,
  onMove,
}: {
  slide: ShopHeroSlide;
  index: number;
  total: number;
  onChange: (patch: Partial<ShopHeroSlide>) => void;
  onSave: () => Promise<void>;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    if (file.size > MAX_BYTES) {
      setErr("Image must be 10 MB or smaller.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/shop-hero/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error ?? "Upload failed");
      else onChange({ image_url: data.url, image_path: data.path });
    } catch {
      setErr("Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setErr("");
    try {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
            Slide {index + 1}
          </span>
          <button
            type="button"
            onClick={() => onChange({ active: !slide.active })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              slide.active ? "bg-destiny-orange" : "bg-black/10"
            }`}
            aria-label={slide.active ? "Active" : "Hidden"}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                slide.active ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-xs text-destiny-grey/50">
            {slide.active ? "Active" : "Hidden"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/50 transition hover:bg-[#f5f7fa] dark:hover:bg-white/10 disabled:opacity-30"
            aria-label="Move up"
          >
            <span className="material-symbols-rounded text-lg">arrow_upward</span>
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/50 transition hover:bg-[#f5f7fa] dark:hover:bg-white/10 disabled:opacity-30"
            aria-label="Move down"
          >
            <span className="material-symbols-rounded text-lg">arrow_downward</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
            aria-label="Delete slide"
          >
            <span className="material-symbols-rounded text-lg">delete</span>
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
          Background image <span className="font-normal">(up to 10 MB)</span>
        </label>
        {slide.image_url ? (
          <div className="relative overflow-hidden rounded-xl border border-black/5 bg-[#f5f7fa]">
            <div className="relative aspect-[21/9] w-full">
              <Image
                src={slide.image_url}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => onChange({ image_url: null, image_path: null })}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
              aria-label="Remove image"
            >
              <span className="material-symbols-rounded text-base">close</span>
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
              A wide landscape image works best
            </p>
          </label>
        )}
      </div>

      {/* Heading */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
          Heading
        </label>
        <input
          type="text"
          value={slide.heading ?? ""}
          onChange={(e) => onChange({ heading: e.target.value })}
          placeholder="New drop is here"
          className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
        />
      </div>

      {/* Subheading */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
          Subheading <span className="font-normal">(optional)</span>
        </label>
        <textarea
          value={slide.subheading ?? ""}
          onChange={(e) => onChange({ subheading: e.target.value })}
          rows={2}
          placeholder="Wear the vision — limited run, collect at church."
          className="w-full resize-none rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
        />
      </div>

      {/* CTA */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
            Button text <span className="font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={slide.cta_text ?? ""}
            onChange={(e) => onChange({ cta_text: e.target.value })}
            placeholder="Shop the drop"
            className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
            Button link <span className="font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={slide.cta_link ?? ""}
            onChange={(e) => onChange({ cta_link: e.target.value })}
            placeholder="/shop/some-product"
            className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
          />
        </div>
      </div>

      {err && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {err}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {saved ? (
            <>
              <span className="material-symbols-rounded text-base">check</span>
              Saved
            </>
          ) : saving ? (
            "Saving…"
          ) : (
            "Save slide"
          )}
        </button>
      </div>
    </div>
  );
}
