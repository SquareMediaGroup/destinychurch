"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatPrice,
  ORDER_STATUS_LABELS,
  SHOP_ADMIN_API,
  type Order,
} from "@/lib/shop";

const TONE_CLASS: Record<string, string> = {
  orange: "bg-destiny-orange/10 text-destiny-orange",
  blue: "bg-destiny-blue/10 text-destiny-blue",
  green: "bg-destiny-green/10 text-destiny-green",
  red: "bg-destiny-red/10 text-destiny-red",
  grey: "bg-destiny-grey/10 text-destiny-grey/60",
};
const STATUS_TONE: Record<string, string> = {
  pending: "orange",
  paid: "blue",
  fulfilled: "green",
  cancelled: "red",
  refunded: "grey",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SHOP_ADMIN_API}/orders`)
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/store"
            className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-destiny-grey/60 hover:text-destiny-grey"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            Store
          </Link>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-black text-destiny-grey">
            Orders
          </h1>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-destiny-grey/50">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center">
          <span className="material-symbols-rounded text-4xl text-destiny-grey/25">
            receipt_long
          </span>
          <p className="mt-3 font-bold text-destiny-grey">No orders yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/store/orders/${o.id}`}
                className="flex items-center gap-4 rounded-xl border border-black/8 bg-white p-4 transition hover:border-destiny-orange/40 hover:bg-[#fffaf5]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-destiny-grey">
                    {o.order_number}
                    <span className="ml-2 font-normal text-destiny-grey/50">
                      {o.customer_name}
                    </span>
                  </p>
                  <p className="text-sm text-destiny-grey/55">
                    {new Date(o.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {formatPrice(o.total_pennies)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    TONE_CLASS[STATUS_TONE[o.status]] ?? TONE_CLASS.grey
                  }`}
                >
                  {ORDER_STATUS_LABELS[o.status]}
                </span>
                <span className="material-symbols-rounded text-destiny-grey/30">
                  chevron_right
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
