"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatPrice,
  ORDER_STATUS_LABELS,
  SHOP_ADMIN_API,
  type Order,
  type OrderStatus,
} from "@/lib/shop";
import {
  PageHeader,
  EmptyState,
  ErrorNote,
  ListToolbar,
  FilterChips,
  CardSkeleton,
  BulkBar,
  ghostBtn,
} from "@/components/admin/AdminUI";
import { useAdminList, useRowSelection } from "@/lib/useAdminList";
import { downloadCsv, toCsv } from "@/lib/csv";

const TONE_CLASS: Record<string, string> = {
  orange: "bg-destiny-orange/10 text-destiny-orange",
  blue: "bg-destiny-blue/10 text-destiny-blue",
  green: "bg-destiny-green/10 text-destiny-green",
  red: "bg-destiny-red/10 text-destiny-red",
  grey: "bg-destiny-grey/10 text-destiny-grey/60 dark:text-white/60",
};
const STATUS_TONE: Record<string, string> = {
  pending: "orange",
  paid: "blue",
  fulfilled: "green",
  cancelled: "red",
  refunded: "grey",
};

const STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "fulfilled",
  "cancelled",
  "refunded",
];

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Mirrors the status actions on the order detail page.
const NEXT_ACTIONS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "fulfilled", label: "Mark fulfilled", icon: "check_circle" },
  { status: "cancelled", label: "Cancel order", icon: "cancel" },
  { status: "refunded", label: "Mark refunded", icon: "currency_pound" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const load = () => {
    fetch(`${SHOP_ADMIN_API}/orders`)
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const list = useAdminList<Order>({
    items: orders,
    // An order gets looked up from an email, a name, or the number on the
    // customer's receipt — all three now work.
    searchKeys: [
      { name: "order_number", weight: 0.4 },
      { name: "customer_name", weight: 0.3 },
      { name: "customer_email", weight: 0.2 },
      { name: "customer_phone", weight: 0.1 },
    ],
    filters: [
      {
        key: "status",
        options: STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] })),
        match: (o, value) => o.status === value,
      },
    ],
    sorts: {
      created: (a, b) => a.created_at.localeCompare(b.created_at),
      total: (a, b) => (a.total_pennies ?? 0) - (b.total_pennies ?? 0),
      customer: (a, b) => a.customer_name.localeCompare(b.customer_name),
    },
    defaultSort: { field: "created", direction: "desc" },
  });

  /** Total of everything currently shown — useful when a filter is applied. */
  const shownTotal = useMemo(
    () =>
      list.visible
        .filter((o) => o.status === "paid" || o.status === "fulfilled")
        .reduce((sum, o) => sum + (o.total_pennies ?? 0), 0),
    [list.visible],
  );

  const selection = useRowSelection(orders);
  const visibleIds = useMemo(() => list.visible.map((o) => o.id), [list.visible]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selection.selected.has(id));

  /** Exports the selection when one is active, otherwise everything on screen —
   * so a filter still doubles as a report selector when nothing is picked. */
  function exportCsv() {
    const rows = selection.count > 0 ? orders.filter((o) => selection.selected.has(o.id)) : list.visible;
    const csv = toCsv(
      [
        "Order number",
        "Date",
        "Status",
        "Customer",
        "Email",
        "Phone",
        "Fulfilment",
        "Subtotal (GBP)",
        "Total (GBP)",
        "Paid at",
        "Notes",
      ],
      rows.map((o) => [
        o.order_number,
        new Date(o.created_at).toISOString().slice(0, 10),
        ORDER_STATUS_LABELS[o.status],
        o.customer_name,
        o.customer_email,
        o.customer_phone ?? "",
        o.fulfillment_method,
        ((o.subtotal_pennies ?? 0) / 100).toFixed(2),
        ((o.total_pennies ?? 0) / 100).toFixed(2),
        o.paid_at ? new Date(o.paid_at).toISOString().slice(0, 10) : "",
        o.notes ?? "",
      ]),
    );
    downloadCsv(`destiny-orders-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function bulkSetStatus(status: OrderStatus) {
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    setWorking(true);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${SHOP_ADMIN_API}/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }).then((r) => {
          if (!r.ok) throw new Error();
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) {
      setError(`${failed} of ${ids.length} could not be marked ${ORDER_STATUS_LABELS[status].toLowerCase()}.`);
    }
    selection.clear();
    setWorking(false);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <PageHeader
        title="Orders"
        subtitle="Customer orders, fulfilment and refunds."
        back={{ href: "/admin/store", label: "Products" }}
        action={
          orders.length > 0 ? (
            <button
              className={ghostBtn}
              onClick={exportCsv}
              title={
                selection.count > 0
                  ? "Download the selected orders as a spreadsheet"
                  : "Download the orders currently shown as a spreadsheet"
              }
            >
              <span className="material-symbols-rounded text-lg" aria-hidden="true">download</span>
              {selection.count > 0 ? `Export selected (${selection.count})` : "Export all"}
            </button>
          ) : undefined
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <CardSkeleton count={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title="No orders yet"
          hint="Orders placed in the shop will appear here."
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search order number, name or email"
            noun="order"
            total={list.total}
            shown={list.shown}
            filters={
              <FilterChips
                label="Status"
                options={list.filterOptions("status")}
                value={list.filterValues.status}
                onChange={(v) => list.setFilter("status", v)}
              />
            }
          >
            <BulkBar count={selection.count} noun="order" onClear={selection.clear}>
              {NEXT_ACTIONS.map((a) => (
                <button
                  key={a.status}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                    a.status === "fulfilled"
                      ? "bg-destiny-green/10 text-destiny-green hover:bg-destiny-green/20"
                      : "bg-black/5 text-destiny-grey/70 dark:text-white/70 hover:bg-black/10"
                  }`}
                  disabled={working}
                  onClick={() => bulkSetStatus(a.status)}
                >
                  {a.label}
                </button>
              ))}
            </BulkBar>
          </ListToolbar>

          {shownTotal > 0 && (
            <p className="mb-4 text-xs font-bold text-destiny-grey/45 dark:text-white/45">
              Paid and fulfilled in this view:{" "}
              <span className="text-destiny-grey dark:text-white">{formatPrice(shownTotal)}</span>
            </p>
          )}

          {list.visible.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No orders match"
              hint="Search an order number, a customer name or an email address."
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
              {list.visible.map((o) => (
                <li
                  key={o.id}
                  className={`flex items-center gap-2 rounded-xl border p-1 transition ${
                    selection.selected.has(o.id)
                      ? "border-destiny-orange/40 bg-destiny-orange/5"
                      : "border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select order ${o.order_number}`}
                    checked={selection.selected.has(o.id)}
                    onChange={() => selection.toggle(o.id)}
                    className="ml-2 shrink-0 accent-destiny-orange"
                  />
                  <Link
                    href={`/admin/store/orders/${o.id}`}
                    className="flex flex-1 items-center gap-4 rounded-xl border border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-4 transition hover:border-destiny-orange/40 hover:bg-[#fffaf5] dark:hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-destiny-grey dark:text-white">
                        {o.order_number}
                        <span className="ml-2 font-normal text-destiny-grey/50 dark:text-white/50">
                          {o.customer_name}
                        </span>
                      </p>
                      <p className="truncate text-sm text-destiny-grey/55 dark:text-white/55">
                        {dateFmt.format(new Date(o.created_at))} ·{" "}
                        {formatPrice(o.total_pennies)} · {o.customer_email}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        TONE_CLASS[STATUS_TONE[o.status]] ?? TONE_CLASS.grey
                      }`}
                    >
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                    <span className="material-symbols-rounded shrink-0 text-destiny-grey/30 dark:text-white/30" aria-hidden="true">
                      chevron_right
                    </span>
                  </Link>
                </li>
              ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
