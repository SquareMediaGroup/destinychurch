"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/shop/ProductCard";
import type { ProductWithVariants } from "@/lib/shop";

// Client-side category filter for the shop grid. Categories are derived
// from the free-text `product.category` field set in the admin.
export default function ShopProductGrid({ products }: { products: ProductWithVariants[] }) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const product of products) {
      if (product.category) set.add(product.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const [active, setActive] = useState<string | null>(null);

  const filtered = active ? products.filter((p) => p.category === active) : products;

  return (
    <>
      {categories.length > 0 && (
        <div
          className="shop-reveal mb-8 flex flex-wrap gap-2"
          style={{ animationDelay: "0.2s" }}
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              active === null
                ? "bg-destiny-grey text-white"
                : "bg-black/5 text-destiny-grey/70 hover:bg-black/10"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActive(category)}
              className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition-colors ${
                active === category
                  ? "bg-destiny-grey text-white"
                  : "bg-black/5 text-destiny-grey/70 hover:bg-black/10"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="shop-reveal rounded-3xl border border-black/10 bg-white/60 p-14 text-center">
          <span className="material-symbols-rounded text-5xl text-destiny-grey/25">
            storefront
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-2xl font-black text-destiny-grey">
            Nothing here yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-destiny-grey/55">
            Try a different category.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {filtered.map((product, i) => (
            <li
              key={product.id}
              className="shop-reveal"
              style={{ animationDelay: `${0.26 + i * 0.06}s` }}
            >
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
