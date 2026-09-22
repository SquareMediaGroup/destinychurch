"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  ErrorNote,
  ListToolbar,
  FilterChips,
  CardSkeleton,
  BulkBar,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/AdminUI";
import { useAdminList, useRowSelection } from "@/lib/useAdminList";
import { useDialog } from "@/components/DialogProvider";
import { downloadCsv, toCsv } from "@/lib/csv";

/** Matches the dashboard's low-stock alert so both agree on "low". */
const LOW_STOCK_THRESHOLD = 3;

export default function AdminStorePage() {
  const { confirm } = useDialog();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const load = () => {
    fetch(`${SHOP_ADMIN_API}/products`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
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

  const selection = useRowSelection(products);
  const visibleIds = useMemo(() => list.visible.map((p) => p.id), [list.visible]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selection.selected.has(id));

  async function bulkPublish(publish: boolean) {
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    setWorking(true);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${SHOP_ADMIN_API}/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_published: publish }),
        }).then((r) => {
          if (!r.ok) throw new Error();
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) {
      setError(
        `${failed} of ${ids.length} could not be ${publish ? "published" : "unpublished"}.`,
      );
    }
    selection.clear();
    setWorking(false);
    load();
  }

  async function bulkDelete() {
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    if (
      !(await confirm({
        title: `Delete ${ids.length} product${ids.length === 1 ? "" : "s"}`,
        message: `This permanently deletes ${ids.length} product${ids.length === 1 ? "" : "s"} and their variants and photos. This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setWorking(true);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${SHOP_ADMIN_API}/products/${id}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error();
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) setError(`${failed} of ${ids.length} could not be deleted.`);
    selection.clear();
    setWorking(false);
    load();
  }

  function exportSelectedCsv() {
    const ids = selection.selected;
    const rows = products.filter((p) => ids.has(p.id));
    const csv = toCsv(
      ["Name", "Price", "Stock", "Status"],
      rows.map((p) => [
        p.name,
        formatPrice(fromPrice(p)),
        totalStock(p),
        p.is_published ? "Published" : "Draft",
      ]),
    );
    downloadCsv(`destiny-products-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <PageHeader
        title="Products"
        subtitle="Products, variants, photos and stock."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/store/orders" className={ghostBtn}>
              <span className="material-symbols-rounded text-lg" aria-hidden="true">receipt_long</span>
              Orders
            </Link>
            <Link href="/admin/store/products/new" className={primaryBtn}>
              <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
              New product
            </Link>
          </div>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <CardSkeleton count={4} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="inventory_2"
          title="No products yet"
          hint="Add your first product to open the store."
          action={
            <Link href="/admin/store/products/new" className={primaryBtn}>
              <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
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
          >
            <BulkBar count={selection.count} noun="product" onClear={selection.clear}>
              <button
                className="rounded-lg bg-destiny-green/10 px-3 py-1.5 text-xs font-bold text-destiny-green transition hover:bg-destiny-green/20 disabled:opacity-50"
                disabled={working}
                onClick={() => bulkPublish(true)}
              >
                Publish
              </button>
              <button
                className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-bold text-destiny-grey/70 dark:text-white/70 transition hover:bg-black/10 disabled:opacity-50"
                disabled={working}
                onClick={() => bulkPublish(false)}
              >
                Unpublish
              </button>
              <button
                className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-bold text-destiny-grey/70 dark:text-white/70 transition hover:bg-black/10 disabled:opacity-50"
                disabled={working}
                onClick={exportSelectedCsv}
              >
                Export selected as CSV
              </button>
              <button
                className="rounded-lg bg-destiny-red/10 px-3 py-1.5 text-xs font-bold text-destiny-red transition hover:bg-destiny-red/20 disabled:opacity-50"
                disabled={working}
                onClick={bulkDelete}
              >
                Delete
              </button>
            </BulkBar>
          </ListToolbar>

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
            <>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold text-destiny-grey/50 dark:text-white/50">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => selection.toggleAll(visibleIds)}
                  className="accent-destiny-orange"
                />
                Select all shown
              </label>
              <ul className="space-y-2">
                {list.visible.map((p) => {
                const stock = totalStock(p);
                const low = stock <= LOW_STOCK_THRESHOLD;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-2 rounded-xl border p-1 transition ${
                      selection.selected.has(p.id)
                        ? "border-destiny-orange/40 bg-destiny-orange/5"
                        : "border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.name}`}
                      checked={selection.selected.has(p.id)}
                      onChange={() => selection.toggle(p.id)}
                      className="ml-2 shrink-0 accent-destiny-orange"
                    />
                    <Link
                      href={`/admin/store/products/${p.id}`}
                      className="flex flex-1 items-center gap-4 rounded-xl border border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-3 transition hover:border-destiny-orange/40 hover:bg-[#fffaf5] dark:hover:bg-white/5"
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
                          <span className="material-symbols-rounded flex h-full w-full items-center justify-center text-xl text-destiny-grey/25 dark:text-white/25" aria-hidden="true">
                            checkroom
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-destiny-grey dark:text-white">{p.name}</p>
                        <p className="text-sm text-destiny-grey/55 dark:text-white/55">
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
                      <span className="hidden shrink-0 text-xs font-bold text-destiny-grey/35 dark:text-white/35 sm:block">
                        {PRODUCT_TYPE_LABELS[p.product_type as ProductType] ?? ""}
                      </span>
                      <span className="material-symbols-rounded shrink-0 text-destiny-grey/30 dark:text-white/30" aria-hidden="true">
                        chevron_right
                      </span>
                    </Link>
                  </li>
                );
              })}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
