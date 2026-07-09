"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useDialog } from "@/components/DialogProvider";
import {
  FIT_LABELS,
  FIT_OPTIONS,
  SHOP_ADMIN_API,
  sizeIndex,
  sizesForFit,
  type Fit,
  type ProductImage,
  type ProductWithVariants,
} from "@/lib/shop";

// A colour the product comes in.
type Colour = { name: string; hex: string };

// Per colour×size cell state. `on` = this combo is stocked/available.
type Cell = { id?: string; stock: number; on: boolean };

const COLOUR_PRESETS: Colour[] = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#ffffff" },
  { name: "Navy", hex: "#1f2a44" },
  { name: "Grey", hex: "#9ca3af" },
  { name: "Red", hex: "#c0362c" },
  { name: "Sand", hex: "#d9c7a3" },
  { name: "Forest", hex: "#2f4a34" },
  { name: "Sky", hex: "#6fb2d2" },
];

const cellKey = (colour: string, size: string) => `${colour}__${size}`;

function penniesToPounds(p: number | null | undefined): string {
  if (p === null || p === undefined) return "";
  return (p / 100).toFixed(2);
}
function poundsToPennies(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

export default function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useDialog();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("0.00");
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [images, setImages] = useState<ProductImage[]>([]);

  // ── Variant model: fit → colours + sizes → an auto-built stock matrix ──
  const [fit, setFit] = useState<Fit>("unisex");
  const [colours, setColours] = useState<Colour[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [defaultStock, setDefaultStock] = useState("10");
  const [newColour, setNewColour] = useState<Colour>({ name: "", hex: "#111111" });

  useEffect(() => {
    fetch(`${SHOP_ADMIN_API}/products/${id}`)
      .then((r) => r.json())
      .then((p: ProductWithVariants) => {
        if (!p || !p.id) return;
        setName(p.name);
        setSlug(p.slug);
        setCategory(p.category ?? "");
        setDescription(p.description ?? "");
        setBasePrice(penniesToPounds(p.base_price_pennies) || "0.00");
        setPublished(p.is_published);
        setFeatured(p.is_featured);
        setSortOrder(p.sort_order);
        setImages(p.images ?? []);
        setFit(p.fit ?? "unisex");

        // Reconstruct colours, sizes and cells from existing variants.
        const cols: Colour[] = [];
        const sz = new Set<string>();
        const nextCells: Record<string, Cell> = {};
        for (const v of p.variants ?? []) {
          const colourName = v.color || "One colour";
          if (!cols.some((c) => c.name === colourName)) {
            cols.push({ name: colourName, hex: v.color_hex ?? "#111111" });
          }
          const size = v.size || "One size";
          sz.add(size);
          nextCells[cellKey(colourName, size)] = {
            id: v.id,
            stock: v.stock,
            on: v.is_active,
          };
        }
        setColours(cols);
        setSizes([...sz].sort((a, b) => sizeIndex(a) - sizeIndex(b)));
        setCells(nextCells);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Chips to offer for the current fit, plus any legacy selected sizes.
  const sizeChips = useMemo(() => {
    const set = new Set<string>([...sizesForFit(fit), ...sizes]);
    return [...set].sort((a, b) => sizeIndex(a) - sizeIndex(b));
  }, [fit, sizes]);

  const variantCount = useMemo(
    () =>
      colours.reduce(
        (n, c) => n + sizes.filter((s) => cells[cellKey(c.name, s)]?.on !== false).length,
        0,
      ),
    [colours, sizes, cells],
  );

  function ensureCells(cols: Colour[], sz: string[]) {
    setCells((prev) => {
      const next = { ...prev };
      const dflt = Math.max(0, Math.round(Number(defaultStock) || 0));
      for (const c of cols) {
        for (const s of sz) {
          const k = cellKey(c.name, s);
          if (!next[k]) next[k] = { stock: dflt, on: true };
        }
      }
      return next;
    });
  }

  function changeFit(next: Fit) {
    if (next === fit) return;
    // Adult ↔ Kids charts don't overlap — drop sizes that aren't valid anymore.
    const allowed = new Set(sizesForFit(next));
    const keptSizes = sizes.filter((s) => allowed.has(s));
    setFit(next);
    setSizes(keptSizes);
    ensureCells(colours, keptSizes);
  }

  function addColour(colour: Colour) {
    const nm = colour.name.trim();
    if (!nm) return;
    if (colours.some((c) => c.name.toLowerCase() === nm.toLowerCase())) {
      toast.info(`${nm} is already added.`);
      return;
    }
    const next = [...colours, { name: nm, hex: colour.hex }];
    setColours(next);
    ensureCells(next, sizes);
    setNewColour({ name: "", hex: "#111111" });
  }

  function removeColour(nameToRemove: string) {
    setColours((cs) => cs.filter((c) => c.name !== nameToRemove));
    setCells((prev) => {
      const next = { ...prev };
      for (const s of sizes) delete next[cellKey(nameToRemove, s)];
      return next;
    });
  }

  function toggleSize(size: string) {
    setSizes((prev) => {
      const has = prev.includes(size);
      const next = has ? prev.filter((s) => s !== size) : [...prev, size];
      const sorted = next.sort((a, b) => sizeIndex(a) - sizeIndex(b));
      if (!has) ensureCells(colours, [size]);
      return [...sorted];
    });
  }

  function setCell(colour: string, size: string, patch: Partial<Cell>) {
    setCells((prev) => {
      const k = cellKey(colour, size);
      return { ...prev, [k]: { ...(prev[k] ?? { stock: 0, on: true }), ...patch } };
    });
  }

  function applyStockToAll() {
    const n = Math.max(0, Math.round(Number(defaultStock) || 0));
    setCells((prev) => {
      const next = { ...prev };
      for (const c of colours) {
        for (const s of sizes) {
          const k = cellKey(c.name, s);
          next[k] = { ...(next[k] ?? { on: true }), stock: n, on: next[k]?.on ?? true };
        }
      }
      return next;
    });
    toast.success(`Set every variant to ${n} in stock.`);
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${SHOP_ADMIN_API}/products/${id}/images`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Upload failed");
          continue;
        }
        setImages((imgs) => [...imgs, { url: data.url, path: data.path, alt: "" }]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeImage(path: string) {
    setImages((imgs) => imgs.filter((i) => i.path !== path));
    fetch(`${SHOP_ADMIN_API}/products/${id}/images?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Product needs a name.");
      return;
    }
    // Build variants from every included colour×size cell, in chart order.
    const singleColour = colours.length === 0;
    const singleSize = sizes.length === 0;
    const colourList = singleColour ? [{ name: "", hex: "#111111" }] : colours;
    const sizeList = singleSize ? [""] : [...sizes].sort((a, b) => sizeIndex(a) - sizeIndex(b));

    const variants: {
      id?: string;
      size: string;
      color: string;
      color_hex: string | null;
      stock: number;
      is_active: boolean;
      sort_order: number;
    }[] = [];
    let order = 0;
    for (const c of colourList) {
      for (const s of sizeList) {
        const k = cellKey(c.name, s);
        const cell = cells[k];
        if (cell && cell.on === false) continue; // excluded combo → dropped
        variants.push({
          id: cell?.id,
          size: s,
          color: c.name,
          color_hex: c.name ? c.hex : null,
          stock: cell ? Math.max(0, Math.round(cell.stock)) : 0,
          is_active: true,
          sort_order: order++,
        });
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`${SHOP_ADMIN_API}/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          category: category.trim() || null,
          fit,
          description: description.trim() || null,
          base_price_pennies: poundsToPennies(basePrice),
          is_published: published,
          is_featured: featured,
          sort_order: sortOrder,
          images,
          variants,
        }),
      });
      const data: ProductWithVariants = await res.json();
      if (!res.ok) {
        toast.error((data as { error?: string }).error || "Could not save");
        return;
      }
      if (data.slug) setSlug(data.slug);
      // Re-map variant ids so subsequent saves update in place.
      setCells((prev) => {
        const next = { ...prev };
        for (const v of data.variants ?? []) {
          const k = cellKey(v.color || "", v.size || "");
          const legacyK = cellKey(v.color || "One colour", v.size || "One size");
          if (next[k]) next[k] = { ...next[k], id: v.id };
          else if (next[legacyK]) next[legacyK] = { ...next[legacyK], id: v.id };
        }
        return next;
      });
      toast.success("Product saved.");
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (
      !(await confirm({
        title: "Delete product",
        message: "Delete this product? This cannot be undone.",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`${SHOP_ADMIN_API}/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product deleted.");
      router.push("/admin/store");
    } else {
      toast.error("Could not delete.");
    }
  }

  if (loading) {
    return <p className="px-8 py-10 text-sm text-destiny-grey/50">Loading…</p>;
  }

  const showMatrix = colours.length > 0 && sizes.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/admin/store"
          className="inline-flex items-center gap-1 text-sm font-semibold text-destiny-grey/60 hover:text-destiny-grey"
        >
          <span className="material-symbols-rounded text-base">arrow_back</span>
          Store
        </Link>
        <div className="flex items-center gap-2">
          {slug && (
            <Link
              href={`/shop/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-bold text-destiny-grey transition hover:bg-[#f5f7fa]"
            >
              <span className="material-symbols-rounded text-base">open_in_new</span>
              View
            </Link>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:bg-destiny-grey/30"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Basics */}
      <Section title="Details">
        <LabeledInput label="Name" value={name} onChange={setName} />
        <LabeledInput
          label="Slug"
          value={slug}
          onChange={setSlug}
          hint="Used in the URL: /shop/your-slug"
        />
        <LabeledInput
          label="Category (optional)"
          value={category}
          onChange={setCategory}
          placeholder="e.g. T-Shirts"
        />
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Base price (£)</FieldLabel>
            <input
              inputMode="decimal"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>
          <div>
            <FieldLabel>Sort order</FieldLabel>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 pt-1">
          <Toggle label="Published" checked={published} onChange={setPublished} />
          <Toggle label="Featured" checked={featured} onChange={setFeatured} />
        </div>
      </Section>

      {/* Photos */}
      <Section title="Photos">
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div
              key={img.path}
              className="group relative h-28 w-28 overflow-hidden rounded-xl border border-black/10 bg-[#f5f7fa]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(img.path)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove image"
              >
                <span className="material-symbols-rounded text-base">close</span>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/15 text-destiny-grey/50 transition hover:border-destiny-orange hover:text-destiny-orange disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-2xl">add_photo_alternate</span>
            <span className="text-xs font-semibold">{uploading ? "Uploading…" : "Add"}</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            multiple
            hidden
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
        <p className="mt-2 text-xs text-destiny-grey/45">
          First photo is the main image. JPG/PNG/WebP · converted to WebP · max 10MB.
        </p>
      </Section>

      {/* ── Variants: fit → colours + sizes → stock matrix ── */}
      <Section
        title="Variants"
        action={
          variantCount > 0 ? (
            <span className="rounded-full bg-destiny-orange/10 px-3 py-1 text-xs font-bold text-destiny-orange">
              {variantCount} variant{variantCount === 1 ? "" : "s"}
            </span>
          ) : null
        }
      >
        {/* Fit */}
        <div>
          <FieldLabel>Who is it for?</FieldLabel>
          <div className="inline-flex flex-wrap gap-1 rounded-full bg-[#f5f7fa] p-1">
            {FIT_OPTIONS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => changeFit(f)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  fit === f
                    ? "bg-destiny-orange text-white shadow-sm"
                    : "text-destiny-grey/60 hover:text-destiny-grey"
                }`}
              >
                {FIT_LABELS[f]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-destiny-grey/45">
            {fit === "kids"
              ? "Kids uses age-based sizes."
              : "Adult sizing (XS–3XL)."}
          </p>
        </div>

        {/* Colours */}
        <div className="border-t border-black/8 pt-5">
          <FieldLabel>Colours</FieldLabel>
          {colours.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {colours.map((c) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-2 rounded-full border border-black/12 py-1.5 pl-1.5 pr-2.5 text-sm font-semibold text-destiny-grey"
                >
                  <span
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                  {c.name}
                  <button
                    type="button"
                    onClick={() => removeColour(c.name)}
                    className="text-destiny-grey/40 transition hover:text-red-600"
                    aria-label={`Remove ${c.name}`}
                  >
                    <span className="material-symbols-rounded text-base">close</span>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add colour */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="color"
              value={newColour.hex}
              onChange={(e) => setNewColour((c) => ({ ...c, hex: e.target.value }))}
              className="h-10 w-12 cursor-pointer rounded-lg border border-black/12"
              aria-label="Colour swatch"
            />
            <input
              value={newColour.name}
              onChange={(e) => setNewColour((c) => ({ ...c, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addColour(newColour);
                }
              }}
              placeholder="Colour name (e.g. Charcoal)"
              className="min-w-0 flex-1 rounded-xl border border-black/15 px-4 py-2.5 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
            />
            <button
              type="button"
              onClick={() => addColour(newColour)}
              className="inline-flex items-center gap-1 rounded-full bg-destiny-grey px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              <span className="material-symbols-rounded text-base">add</span>
              Add
            </button>
          </div>

          {/* Presets */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-destiny-grey/40">Quick add:</span>
            {COLOUR_PRESETS.filter(
              (p) => !colours.some((c) => c.name.toLowerCase() === p.name.toLowerCase()),
            ).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => addColour(p)}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 py-1 pl-1 pr-2.5 text-xs font-semibold text-destiny-grey/70 transition hover:border-destiny-orange hover:text-destiny-grey"
              >
                <span
                  className="h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: p.hex }}
                />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sizes */}
        <div className="border-t border-black/8 pt-5">
          <FieldLabel>Sizes</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {sizeChips.map((s) => {
              const selected = sizes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSize(s)}
                  aria-pressed={selected}
                  className={`min-w-[3rem] rounded-full border px-4 py-2 text-sm font-bold transition ${
                    selected
                      ? "border-destiny-orange bg-destiny-orange text-white"
                      : "border-black/15 text-destiny-grey hover:border-destiny-orange"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-destiny-grey/45">
            Pick the sizes you stock — they apply to <strong>every colour</strong>. Fine-tune
            each combination below.
          </p>
        </div>

        {/* Stock matrix */}
        {showMatrix ? (
          <div className="border-t border-black/8 pt-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <FieldLabel>Stock</FieldLabel>
              <div className="ml-auto flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={defaultStock}
                  onChange={(e) => setDefaultStock(e.target.value)}
                  className="w-20 rounded-lg border border-black/15 px-3 py-1.5 text-sm outline-none focus:border-destiny-orange"
                  aria-label="Default stock"
                />
                <button
                  type="button"
                  onClick={applyStockToAll}
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-destiny-grey transition hover:bg-[#f5f7fa]"
                >
                  <span className="material-symbols-rounded text-base">done_all</span>
                  Apply to all
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white" />
                    {[...sizes]
                      .sort((a, b) => sizeIndex(a) - sizeIndex(b))
                      .map((s) => (
                        <th
                          key={s}
                          className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-destiny-grey/50"
                        >
                          {s}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {colours.map((c) => (
                    <tr key={c.name}>
                      <th className="sticky left-0 z-10 bg-white pr-3 text-left">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap font-semibold text-destiny-grey">
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.name}
                        </span>
                      </th>
                      {[...sizes]
                        .sort((a, b) => sizeIndex(a) - sizeIndex(b))
                        .map((s) => {
                          const cell = cells[cellKey(c.name, s)] ?? { stock: 0, on: true };
                          return (
                            <td key={s} className="p-0">
                              {cell.on === false ? (
                                <button
                                  type="button"
                                  onClick={() => setCell(c.name, s, { on: true })}
                                  title="Not available — click to add"
                                  className="flex h-10 w-full min-w-[3.5rem] items-center justify-center rounded-lg border border-dashed border-black/15 text-destiny-grey/30 transition hover:border-destiny-orange hover:text-destiny-orange"
                                >
                                  <span className="material-symbols-rounded text-base">add</span>
                                </button>
                              ) : (
                                <div className="group relative">
                                  <input
                                    type="number"
                                    min={0}
                                    value={cell.stock}
                                    onChange={(e) =>
                                      setCell(c.name, s, {
                                        stock: Math.max(0, Math.round(Number(e.target.value) || 0)),
                                      })
                                    }
                                    className={`h-10 w-full min-w-[3.5rem] rounded-lg border px-2 text-center text-sm outline-none transition focus:border-destiny-orange ${
                                      cell.stock === 0
                                        ? "border-destiny-red/30 bg-destiny-red/5 text-destiny-red"
                                        : "border-black/12"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setCell(c.name, s, { on: false })}
                                    title="Remove this combination"
                                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destiny-grey text-white group-hover:flex"
                                  >
                                    <span className="material-symbols-rounded text-[11px]">close</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-destiny-grey/45">
              Red means sold out (still listed). Hover a cell and click × to remove a
              colour/size combination entirely.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-black/15 bg-[#f9fafb] px-4 py-6 text-center text-sm text-destiny-grey/50">
            {colours.length === 0 && sizes.length === 0
              ? "Add at least one colour and one size to build your stock grid."
              : colours.length === 0
                ? "Add a colour to build your stock grid."
                : "Pick your sizes to build your stock grid."}
            <br />
            <span className="text-xs">
              No colours or sizes? Just set a base price and save — it&apos;ll sell as a
              single one-size item.
            </span>
          </div>
        )}
      </Section>

      {/* Danger */}
      <div className="mt-8 border-t border-black/8 pt-6">
        <button
          type="button"
          onClick={deleteProduct}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 transition hover:text-red-700"
        >
          <span className="material-symbols-rounded text-base">delete</span>
          Delete product
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-black/8 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-heading)] text-sm font-black uppercase tracking-wide text-destiny-grey">
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-destiny-grey/50">
      {children}
    </label>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
      />
      {hint && <p className="mt-1 text-xs text-destiny-grey/45">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
    >
      <span
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-destiny-orange" : "bg-black/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </span>
      <span className="text-sm font-bold text-destiny-grey">{label}</span>
    </button>
  );
}
