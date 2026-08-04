"use client";

// Admin for the /nfc page's tiles.
//
// Connect Card and Giving are hardcoded in lib/nfcTiles.ts and shown here as
// read-only rows: they always render on /nfc, and the alternative — seeding them
// as ordinary rows — is a delete button away from a service with no connect card.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useDialog } from "@/components/DialogProvider";
import { PINNED_TILES } from "@/lib/nfcTiles";

interface Tile {
  id: string;
  active: boolean;
  sort_order: number;
  title: string;
  subtitle: string;
  icon: string;
  mode: "embed" | "info";
  embed_url: string;
  embed_size: "md" | "lg";
  body: string;
  image_url: string | null;
  image_path: string | null;
  cta_text: string;
  cta_link: string;
}

const MAX_BYTES = 50 * 1024 * 1024;

const EMPTY: Tile = {
  id: "",
  active: true,
  sort_order: 0,
  title: "",
  subtitle: "",
  icon: "star",
  mode: "info",
  embed_url: "",
  embed_size: "md",
  body: "",
  image_url: null,
  image_path: null,
  cta_text: "",
  cta_link: "",
};

const inputClass =
  "w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20";
const labelClass = "mb-1.5 block text-xs font-bold text-destiny-grey/60";

/** A starting set of Material Symbols that suit the kinds of tile this page has. */
const ICON_CHOICES = [
  "star",
  "menu_book",
  "groups",
  "diversity_3",
  "water_drop",
  "child_care",
  "event",
  "favorite",
  "school",
  "coffee",
  "handshake",
  "campaign",
];

function normalise(row: Record<string, unknown>): Tile {
  return {
    id: String(row.id ?? ""),
    active: row.active !== false,
    sort_order: Number(row.sort_order ?? 0),
    title: String(row.title ?? ""),
    subtitle: String(row.subtitle ?? ""),
    icon: String(row.icon ?? "star"),
    mode: row.mode === "embed" ? "embed" : "info",
    embed_url: String(row.embed_url ?? ""),
    embed_size: row.embed_size === "lg" ? "lg" : "md",
    body: String(row.body ?? ""),
    image_url: (row.image_url as string) ?? null,
    image_path: (row.image_path as string) ?? null,
    cta_text: String(row.cta_text ?? ""),
    cta_link: String(row.cta_link ?? ""),
  };
}

export default function AdminNfcPage() {
  const { confirm } = useDialog();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/nfc");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load tiles");
      setTiles((data as Record<string, unknown>[]).map(normalise));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
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
      fd.append("prefix", "nfc");
      const res = await fetch("/api/admin/popup/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setEditing((t) =>
          t ? { ...t, image_url: data.url, image_path: data.path } : t
        );
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    const isNew = !editing.id;
    const res = await fetch("/api/admin/nfc", {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editing,
        sort_order: isNew ? tiles.length : editing.sort_order,
      }),
    });
    if (res.ok) {
      setEditing(null);
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong");
    }
    setSaving(false);
  }

  async function toggleActive(tile: Tile) {
    setError("");
    const res = await fetch("/api/admin/nfc", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...tile, active: !tile.active }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not update tile");
      return;
    }
    await load();
  }

  /** Swap a tile with its neighbour and persist both sort_orders. */
  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= tiles.length) return;
    setError("");
    const a = { ...tiles[index], sort_order: target };
    const b = { ...tiles[target], sort_order: index };
    await Promise.all(
      [a, b].map((t) =>
        fetch("/api/admin/nfc", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t),
        })
      )
    );
    await load();
  }

  async function remove(tile: Tile) {
    const ok = await confirm({
      title: "Delete tile",
      message: `Remove "${tile.title}" from the NFC page? This can't be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setError("");
    const res = await fetch(`/api/admin/nfc?id=${encodeURIComponent(tile.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not delete tile");
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-destiny-grey">NFC Page</h1>
            <p className="mt-1 text-sm text-destiny-grey/50">
              The tiles people see at destinytees.uk/nfc when they tap the seat in
              front of them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError("");
              setEditing({ ...EMPTY });
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
          >
            <span className="material-symbols-rounded text-base">add</span>
            New tile
          </button>
        </div>

        {error && (
          <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* The two fixtures */}
        <div className="mb-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-destiny-grey/40">
            Always shown
          </p>
          <ul className="flex flex-col gap-2">
            {PINNED_TILES.map((t) => (
              <li key={t.id} className="flex items-center gap-3 text-sm">
                <span className="material-symbols-rounded text-xl text-destiny-orange">
                  {t.icon}
                </span>
                <span className="font-bold text-destiny-grey">{t.title}</span>
                <span className="text-destiny-grey/45">{t.subtitle}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-destiny-grey/45">
            These two are built into the page so they can never go missing. Ask a
            developer if the forms behind them need changing.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
              progress_activity
            </span>
          </div>
        ) : tiles.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-black/10 px-6 py-12 text-center">
            <p className="text-sm font-bold text-destiny-grey">No extra tiles yet</p>
            <p className="mt-1 text-xs text-destiny-grey/50">
              Add one for Alpha, a course, or any ChurchSuite form you want on the
              page.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {tiles.map((tile, i) => (
              <li
                key={tile.id}
                className={`flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm ${
                  tile.active ? "" : "opacity-55"
                }`}
              >
                <span className="material-symbols-rounded text-2xl text-destiny-orange">
                  {tile.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-destiny-grey">
                    {tile.title}
                  </p>
                  <p className="truncate text-xs text-destiny-grey/50">
                    {tile.mode === "embed"
                      ? `Form · ${tile.embed_url}`
                      : `Details${tile.cta_link ? ` · ${tile.cta_link}` : ""}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <span className="material-symbols-rounded text-lg">
                      arrow_upward
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === tiles.length - 1}
                    aria-label="Move down"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <span className="material-symbols-rounded text-lg">
                      arrow_downward
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(tile)}
                    className={`relative mx-2 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      tile.active ? "bg-destiny-orange" : "bg-black/10"
                    }`}
                    aria-label={tile.active ? "Hide tile" : "Show tile"}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        tile.active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setEditing(tile);
                    }}
                    aria-label="Edit"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey"
                  >
                    <span className="material-symbols-rounded text-lg">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(tile)}
                    aria-label="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <span className="material-symbols-rounded text-lg">delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Editor */}
        {editing && (
          <form
            onSubmit={save}
            className="mt-8 flex flex-col gap-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-destiny-grey">
                {editing.id ? "Edit tile" : "New tile"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Cancel"
                className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey"
              >
                <span className="material-symbols-rounded text-xl">close</span>
              </button>
            </div>

            {/* What kind of tile */}
            <div>
              <label className={labelClass}>What happens when someone taps it</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      mode: "embed" as const,
                      label: "Opens a form",
                      hint: "A ChurchSuite form or event, filled in without leaving the page",
                    },
                    {
                      mode: "info" as const,
                      label: "Shows details",
                      hint: "Artwork and a description, with a button through to a page",
                    },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() =>
                      setEditing((t) => (t ? { ...t, mode: opt.mode } : t))
                    }
                    className={`rounded-xl border-2 p-4 text-left transition ${
                      editing.mode === opt.mode
                        ? "border-destiny-orange bg-destiny-orange/5"
                        : "border-black/10 hover:border-destiny-orange/40"
                    }`}
                  >
                    <p className="text-sm font-bold text-destiny-grey">
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-xs text-destiny-grey/50">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={editing.title}
                  onChange={(e) =>
                    setEditing((t) => (t ? { ...t, title: e.target.value } : t))
                  }
                  placeholder="Alpha"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Subtitle <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={90}
                  value={editing.subtitle}
                  onChange={(e) =>
                    setEditing((t) => (t ? { ...t, subtitle: e.target.value } : t))
                  }
                  placeholder="Explore life, faith and meaning"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className={labelClass}>Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICON_CHOICES.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditing((t) => (t ? { ...t, icon } : t))}
                    aria-label={icon}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 transition ${
                      editing.icon === icon
                        ? "border-destiny-orange bg-destiny-orange/5 text-destiny-orange"
                        : "border-black/10 text-destiny-grey/50 hover:border-destiny-orange/40"
                    }`}
                  >
                    <span className="material-symbols-rounded text-xl">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {editing.mode === "embed" ? (
              <>
                <div>
                  <label className={labelClass}>ChurchSuite URL</label>
                  <input
                    type="url"
                    required
                    value={editing.embed_url}
                    onChange={(e) =>
                      setEditing((t) =>
                        t ? { ...t, embed_url: e.target.value } : t
                      )
                    }
                    placeholder="https://destinytees.churchsuite.com/forms/xxxxxxxx"
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-xs text-destiny-grey/45">
                    Must be a churchsuite.com link — nothing else can be shown
                    inside the page.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Popup size</label>
                  <div className="flex gap-2">
                    {(["md", "lg"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setEditing((t) => (t ? { ...t, embed_size: size } : t))
                        }
                        className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
                          editing.embed_size === size
                            ? "border-destiny-orange bg-destiny-orange/5 text-destiny-grey"
                            : "border-black/10 text-destiny-grey/50 hover:border-destiny-orange/40"
                        }`}
                      >
                        {size === "md" ? "Standard form" : "Tall (full event page)"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={labelClass}>
                    Image <span className="font-normal">(optional, up to 50 MB)</span>
                  </label>
                  {editing.image_url ? (
                    <div className="relative overflow-hidden rounded-xl border border-black/5 bg-[#f5f7fa]">
                      <div className="relative aspect-[16/9] w-full">
                        <Image
                          src={editing.image_url}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditing((t) =>
                            t ? { ...t, image_url: null, image_path: null } : t
                          )
                        }
                        aria-label="Remove image"
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
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

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    rows={4}
                    maxLength={600}
                    value={editing.body}
                    onChange={(e) =>
                      setEditing((t) => (t ? { ...t, body: e.target.value } : t))
                    }
                    placeholder="Eleven weeks, free food, and any question you like. Starts Wednesday 17 September."
                    className={`resize-none ${inputClass}`}
                  />
                </div>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Button text{" "}
                  <span className="font-normal">
                    {editing.mode === "embed" ? "(optional)" : ""}
                  </span>
                </label>
                <input
                  type="text"
                  value={editing.cta_text}
                  onChange={(e) =>
                    setEditing((t) => (t ? { ...t, cta_text: e.target.value } : t))
                  }
                  placeholder="Find out more"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Button link{" "}
                  <span className="font-normal">
                    {editing.mode === "embed" ? "(optional)" : ""}
                  </span>
                </label>
                <input
                  type="text"
                  value={editing.cta_link}
                  onChange={(e) =>
                    setEditing((t) => (t ? { ...t, cta_link: e.target.value } : t))
                  }
                  placeholder="/alpha"
                  className={inputClass}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-destiny-grey/45">
              {editing.mode === "embed"
                ? "Shown as a small link under the form, for people who want the full page."
                : "Where the button in the popup takes people. Use /alpha for a page on this site."}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-destiny-grey/60 transition hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? "Saving…" : editing.id ? "Save changes" : "Add tile"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
