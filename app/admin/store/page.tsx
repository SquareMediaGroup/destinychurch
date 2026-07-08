"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatPrice,
  fromPrice,
  totalStock,
  SHOP_ADMIN_API,
  type ProductWithVariants,
} from "@/lib/shop";

export default function AdminStorePage() {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SHOP_ADMIN_API}/products`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-black text-destiny-grey">
            Store
          </h1>
          <p className="mt-1 text-sm text-destiny-grey/55">
            Manage products, variants and stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/store/orders"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-bold text-destiny-grey transition hover:bg-[#f5f7fa]"
          >
            <span className="material-symbols-rounded text-lg">receipt_long</span>
            Orders
          </Link>
          <Link
            href="/admin/store/products/new"
            className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            <span className="material-symbols-rounded text-lg">add</span>
            New product
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-destiny-grey/50">Loading…</p>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center">
          <span className="material-symbols-rounded text-4xl text-destiny-grey/25">
            inventory_2
          </span>
          <p className="mt-3 font-bold text-destiny-grey">No products yet</p>
          <p className="mt-1 text-sm text-destiny-grey/55">
            Add your first product to open the store.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => {
            const stock = totalStock(p);
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/store/products/${p.id}`}
                  className="flex items-center gap-4 rounded-xl border border-black/8 bg-white p-3 transition hover:border-destiny-orange/40 hover:bg-[#fffaf5]"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f5f7fa]">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0].url}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-rounded flex h-full w-full items-center justify-center text-xl text-destiny-grey/25">
                        checkroom
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-destiny-grey">{p.name}</p>
                    <p className="text-sm text-destiny-grey/55">
                      {formatPrice(fromPrice(p))} · {p.variants.length} variant
                      {p.variants.length === 1 ? "" : "s"} · {stock} in stock
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      p.is_published
                        ? "bg-destiny-green/10 text-destiny-green"
                        : "bg-destiny-grey/10 text-destiny-grey/60"
                    }`}
                  >
                    {p.is_published ? "Published" : "Draft"}
                  </span>
                  <span className="material-symbols-rounded text-destiny-grey/30">
                    chevron_right
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
