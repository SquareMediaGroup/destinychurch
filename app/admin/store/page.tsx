"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatPrice,
  fromPrice,
  totalStock,
  PRODUCT_TYPE_LABELS,
  SHOP_ADMIN_API,
  type ProductType,
  type ProductWithVariants,
} from "@/lib/shop";
import {
  PageHeader,
  Badge,
  EmptyState,
  ListToolbar,
  FilterChips,
  CardSkeleton,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/AdminUI";
import { useAdminList } from "@/lib/useAdminList";

/** Matches the dashboard's low-stock alert so both agree on "low". */
const LOW_STOCK_THRESHOLD = 3;

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

  const list = useAdminList<ProductWithVariants>({
    items: products,
    searchKeys: [
      { name: "name", weight: 0.5 },
      { name: "category", weight: 0.2 },
      { name: "description", weight: 0.1 },
      { name: "slug", weight: 0.1 },
      // Staff search by the code on the label as often as by the name.
      { name: "variants.sku", weight: 0.1 },
    ],
    filters: [
      {
        key: "status",
        options: [
          { value: "published", label: "Published" },
          { value: "draft", label: "Draft" },
        ],
        match: (p, value) => (value === "published" ? p.is_published : !p.is_published),
      },
      {
        // ?stock=low is the link the dashboard's low-stock alert points at.
        key: "stock",
        options: [
          { value: "low", label: "Low stock" },
          { value: "out", label: "Sold out" },
        ],
        match: (p, value) => {
          const stock = totalStock(p);
          return value === "out" ? stock === 0 : stock <= LOW_STOCK_THRESHOLD;
        },
      },
    ],
    sorts: {
      name: (a, b) => a.name.localeCompare(b.name),
      price: (a, b) => fromPrice(a) - fromPrice(b),
      stock: (a, b) => totalStock(a) - totalStock(b),
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <PageHeader
        title="Products"
        subtitle="Products, variants, photos and stock."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/store/orders" className={ghostBtn}>
              <span className="material-symbols-rounded text-lg">receipt_long</span>
              Orders
            </Link>
            <Link href="/admin/store/products/new" className={primaryBtn}>
              <span className="material-symbols-rounded text-lg">add</span>
              New product
            </Link>
          </div>
        }
      />

      {loading ? (
        <CardSkeleton count={4} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="inventory_2"
          title="No products yet"
          hint="Add your first product to open the store."
          action={
            <Link href="/admin/store/products/new" className={primaryBtn}>
              <span className="material-symbols-rounded text-lg">add</span>
              New product
            </Link>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search name, category or SKU"
            noun="product"
            total={list.total}
            shown={list.shown}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <FilterChips
                  label="Status"
                  options={list.filterOptions("status")}
                  value={list.filterValues.status}
                  onChange={(v) => list.setFilter("status", v)}
                />
                <FilterChips
                  label="Stock"
                  options={list.filterOptions("stock").filter((o) => o.value !== "all")}
                  value={list.filterValues.stock}
                  onChange={(v) =>
                    list.setFilter("stock", list.filterValues.stock === v ? "all" : v)
                  }
                />
              </div>
            }
          />

          {list.visible.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No products match"
              hint="Try part of the name, the category, or a SKU."
              action={
                <button
                  className="text-sm font-bold text-destiny-orange hover:brightness-110"
                  onClick={list.clearAll}
                >
                  Clear search and filters
                </button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {list.visible.map((p) => {
                const stock = totalStock(p);
                const low = stock <= LOW_STOCK_THRESHOLD;
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
                          {p.variants.length === 1 ? "" : "s"} ·{" "}
                          <span
                            className={
                              stock === 0
                                ? "font-bold text-destiny-red"
                                : low
                                  ? "font-bold text-destiny-orange"
                                  : ""
                            }
                          >
                            {stock} in stock
                          </span>
                          {p.category ? ` · ${p.category}` : ""}
                        </p>
                      </div>
                      {p.is_published && low && (
                        <Badge tone={stock === 0 ? "red" : "orange"}>
                          {stock === 0 ? "Sold out" : "Low"}
                        </Badge>
                      )}
                      <Badge tone={p.is_published ? "green" : "grey"}>
                        {p.is_published ? "Published" : "Draft"}
                      </Badge>
                      <span className="hidden shrink-0 text-xs font-bold text-destiny-grey/35 sm:block">
                        {PRODUCT_TYPE_LABELS[p.product_type as ProductType] ?? ""}
                      </span>
                      <span className="material-symbols-rounded shrink-0 text-destiny-grey/30">
                        chevron_right
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
