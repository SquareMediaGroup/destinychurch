"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import { useCart } from "@/lib/cart-store";
import {
  formatPrice,
  sizeIndex,
  variantPrice,
  type ProductVariant,
  type ProductWithVariants,
} from "@/lib/shop";

export default function ProductBuyPanel({ product }: { product: ProductWithVariants }) {
  const toast = useToast();
  const add = useCart((s) => s.add);

  const active = useMemo(
    () => product.variants.filter((v) => v.is_active),
    [product.variants],
  );

  // Distinct colour/size dimensions (a dimension is "present" if any variant
  // carries a non-empty value for it).
  const colors = useMemo(() => {
    const seen = new Map<string, string | null>(); // color -> hex
    active.forEach((v) => {
      if (v.color && !seen.has(v.color)) seen.set(v.color, v.color_hex);
    });
    return [...seen.entries()].map(([color, hex]) => ({ color, hex }));
  }, [active]);
  const sizes = useMemo(
    () =>
      [...new Set(active.map((v) => v.size).filter(Boolean))].sort(
        (a, b) => sizeIndex(a) - sizeIndex(b),
      ),
    [active],
  );
  const hasColor = colors.length > 0;
  const hasSize = sizes.length > 0;

  const [selColor, setSelColor] = useState<string>(
    hasColor ? colors[0].color : "",
  );
  const [selSize, setSelSize] = useState<string>(hasSize ? sizes[0] : "");
  const [qty, setQty] = useState(1);

  const stockFor = (color: string, size: string): number =>
    active
      .filter((v) => v.color === color && v.size === size)
      .reduce((n, v) => n + v.stock, 0);

  // Is a colour available in any size?
  const colorAvailable = (color: string) =>
    active.some((v) => v.color === color && v.stock > 0);
  // Is a size available for the currently-selected colour?
  const sizeAvailable = (size: string) => stockFor(selColor, size) > 0;

  const selected: ProductVariant | undefined = useMemo(
    () =>
      active.find(
        (v) => v.color === selColor && v.size === (hasSize ? selSize : ""),
      ),
    [active, selColor, selSize, hasSize],
  );

  const inStock = (selected?.stock ?? 0) > 0;
  const price = selected
    ? variantPrice(selected, product)
    : product.base_price_pennies;

  function handleAdd() {
    if (!selected || !inStock) {
      toast.error("That option isn't available right now.");
      return;
    }
    const clampedQty = Math.min(qty, selected.stock);
    add({
      productId: product.id,
      variantId: selected.id,
      slug: product.slug,
      name: product.name,
      size: selected.size,
      color: selected.color,
      colorHex: selected.color_hex,
      unitPricePennies: variantPrice(selected, product),
      image: product.images[0]?.url ?? null,
      quantity: clampedQty,
    });
    toast.success(`${product.name} added to your basket.`, "Added");
  }

  return (
    <div className="mt-6">
      {/* Price */}
      <p className="text-2xl font-black text-destiny-grey">{formatPrice(price)}</p>

      {/* Colour */}
      {hasColor && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-destiny-grey/50">
            Colour{selColor ? `: ${selColor}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {colors.map(({ color, hex }) => {
              const avail = colorAvailable(color);
              const isSel = color === selColor;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelColor(color);
                    if (hasSize && stockFor(color, selSize) <= 0) {
                      const firstAvail = sizes.find((s) => stockFor(color, s) > 0);
                      setSelSize(firstAvail ?? sizes[0]);
                    }
                  }}
                  title={color}
                  aria-label={color}
                  aria-pressed={isSel}
                  className={`relative h-9 w-9 rounded-full border transition ${
                    isSel
                      ? "border-destiny-orange ring-2 ring-destiny-orange/30"
                      : "border-black/15 hover:border-black/40"
                  } ${!avail ? "opacity-40" : ""}`}
                  style={{ backgroundColor: hex || "#e5e7eb" }}
                >
                  {!avail && (
                    <span className="absolute inset-0 m-auto h-px w-7 rotate-45 bg-destiny-grey/60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size */}
      {hasSize && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-destiny-grey/50">
            Size
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {sizes.map((size) => {
              const avail = sizeAvailable(size);
              const isSel = size === selSize;
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!avail}
                  onClick={() => setSelSize(size)}
                  aria-pressed={isSel}
                  className={`min-w-[3rem] rounded-full border px-4 py-2 text-sm font-bold transition ${
                    isSel
                      ? "border-destiny-orange bg-destiny-orange text-white"
                      : "border-black/15 text-destiny-grey hover:border-destiny-orange"
                  } ${!avail ? "cursor-not-allowed border-black/5 text-destiny-grey/30 line-through" : ""}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity + add */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex items-center rounded-full border border-black/15">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-destiny-grey/70 transition hover:text-destiny-grey"
            aria-label="Decrease quantity"
          >
            <span className="material-symbols-rounded text-lg">remove</span>
          </button>
          <span className="w-8 text-center text-sm font-bold text-destiny-grey">{qty}</span>
          <button
            type="button"
            onClick={() =>
              setQty((q) => Math.min(selected?.stock ?? 99, q + 1))
            }
            className="flex h-11 w-11 items-center justify-center text-destiny-grey/70 transition hover:text-destiny-grey"
            aria-label="Increase quantity"
          >
            <span className="material-symbols-rounded text-lg">add</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:bg-destiny-orange-dark disabled:cursor-not-allowed disabled:bg-destiny-grey/30 disabled:shadow-none"
        >
          <span className="material-symbols-rounded text-lg">shopping_bag</span>
          {inStock ? "Add to basket" : "Sold out"}
        </button>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-destiny-grey/50">
        <span className="material-symbols-rounded text-sm">storefront</span>
        Collect at church — we&apos;ll email you when it&apos;s ready.
      </p>
      <Link
        href="/shop/cart"
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-destiny-orange underline-offset-4 hover:underline"
      >
        View basket
        <span className="material-symbols-rounded text-base">arrow_forward</span>
      </Link>
    </div>
  );
}
