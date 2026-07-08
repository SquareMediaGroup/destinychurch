"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { SHOP_ADMIN_API, type ProductImage, type ProductWithVariants } from "@/lib/shop";

type EditVariant = {
  key: string;
  id?: string;
  size: string;
  color: string;
  color_hex: string;
  sku: string;
  price: string; // pounds; "" = inherit base price
  stock: string;
  is_active: boolean;
};

let keySeq = 0;
const newKey = () => `v${Date.now()}-${keySeq++}`;

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
  const [variants, setVariants] = useState<EditVariant[]>([]);

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
        setVariants(
          (p.variants ?? []).map((v) => ({
            key: newKey(),
            id: v.id,
            size: v.size,
            color: v.color,
            color_hex: v.color_hex ?? "",
            sku: v.sku ?? "",
            price: penniesToPounds(v.price_pennies),
            stock: String(v.stock),
            is_active: v.is_active,
          })),
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  function addVariant() {
    setVariants((vs) => [
      ...vs,
      {
        key: newKey(),
        size: "",
        color: "",
        color_hex: "",
        sku: "",
        price: "",
        stock: "0",
        is_active: true,
      },
    ]);
  }
  function updateVariant(key: string, patch: Partial<EditVariant>) {
    setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }
  function removeVariant(key: string) {
    setVariants((vs) => vs.filter((v) => v.key !== key));
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
    // Best-effort delete from storage.
    fetch(`${SHOP_ADMIN_API}/products/${id}/images?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Product needs a name.");
      return;
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
          description: description.trim() || null,
          base_price_pennies: poundsToPennies(basePrice),
          is_published: published,
          is_featured: featured,
          sort_order: sortOrder,
          images,
          variants: variants.map((v, i) => ({
            id: v.id,
            size: v.size.trim(),
            color: v.color.trim(),
            color_hex: v.color_hex.trim() || null,
            sku: v.sku.trim() || null,
            price_pennies: v.price.trim() === "" ? null : poundsToPennies(v.price),
            stock: Math.max(0, Math.round(Number(v.stock) || 0)),
            is_active: v.is_active,
            sort_order: i,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save");
        return;
      }
      // Refresh IDs/slug from the server (variants may have been created).
      if (data.slug) setSlug(data.slug);
      if (Array.isArray(data.variants)) {
        setVariants((prev) =>
          prev.map((v, i) => ({
            ...v,
            id:
              data.variants.find(
                (dv: { size: string; color: string }) =>
                  dv.size === v.size.trim() && dv.color === v.color.trim(),
              )?.id ?? v.id,
            key: v.key || newKey() + i,
          })),
        );
      }
      toast.success("Product saved.");
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!confirm("Delete this product? This cannot be undone.")) return;
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

      {/* Images */}
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

      {/* Variants */}
      <Section
        title="Variants"
        action={
          <button
            type="button"
            onClick={addVariant}
            className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-destiny-grey transition hover:bg-[#f5f7fa]"
          >
            <span className="material-symbols-rounded text-base">add</span>
            Add variant
          </button>
        }
      >
        {variants.length === 0 ? (
          <p className="text-sm text-destiny-grey/50">
            No variants yet. Add sizes and colours (e.g. Black / M). Leave size and
            colour blank for a single one-size product.
          </p>
        ) : (
          <div className="space-y-2">
            {/* header row */}
            <div className="hidden grid-cols-[1fr_1fr_2.5rem_5rem_4.5rem_2.5rem] gap-2 px-1 text-[11px] font-bold uppercase tracking-wide text-destiny-grey/40 sm:grid">
              <span>Colour</span>
              <span>Size</span>
              <span>Hex</span>
              <span>Price £</span>
              <span>Stock</span>
              <span />
            </div>
            {variants.map((v) => (
              <div
                key={v.key}
                className={`grid grid-cols-2 gap-2 rounded-xl border border-black/8 p-2 sm:grid-cols-[1fr_1fr_2.5rem_5rem_4.5rem_2.5rem] sm:items-center ${
                  v.is_active ? "bg-white" : "bg-[#f5f7fa] opacity-70"
                }`}
              >
                <input
                  placeholder="Colour"
                  value={v.color}
                  onChange={(e) => updateVariant(v.key, { color: e.target.value })}
                  className="rounded-lg border border-black/12 px-3 py-2 text-sm outline-none focus:border-destiny-orange"
                />
                <input
                  placeholder="Size"
                  value={v.size}
                  onChange={(e) => updateVariant(v.key, { size: e.target.value })}
                  className="rounded-lg border border-black/12 px-3 py-2 text-sm outline-none focus:border-destiny-orange"
                />
                <input
                  type="color"
                  value={v.color_hex || "#000000"}
                  onChange={(e) => updateVariant(v.key, { color_hex: e.target.value })}
                  className="h-9 w-full cursor-pointer rounded-lg border border-black/12"
                  title="Colour swatch"
                />
                <input
                  placeholder="base"
                  inputMode="decimal"
                  value={v.price}
                  onChange={(e) => updateVariant(v.key, { price: e.target.value })}
                  className="rounded-lg border border-black/12 px-3 py-2 text-sm outline-none focus:border-destiny-orange"
                  title="Leave blank to use the base price"
                />
                <input
                  type="number"
                  min={0}
                  value={v.stock}
                  onChange={(e) => updateVariant(v.key, { stock: e.target.value })}
                  className="rounded-lg border border-black/12 px-3 py-2 text-sm outline-none focus:border-destiny-orange"
                />
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => updateVariant(v.key, { is_active: !v.is_active })}
                    title={v.is_active ? "Active" : "Hidden"}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition ${
                      v.is_active
                        ? "text-destiny-green hover:bg-destiny-green/10"
                        : "text-destiny-grey/40 hover:bg-black/5"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base">
                      {v.is_active ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVariant(v.key)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove variant"
                  >
                    <span className="material-symbols-rounded text-base">delete</span>
                  </button>
                </div>
              </div>
            ))}
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
      <div className="space-y-4">{children}</div>
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
