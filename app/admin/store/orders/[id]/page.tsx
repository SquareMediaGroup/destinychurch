"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { PageLoading } from "@/components/admin/AdminUI";
import {
  formatPrice,
  ORDER_STATUS_LABELS,
  SHOP_ADMIN_API,
  type OrderStatus,
  type OrderWithItems,
} from "@/lib/shop";

const NEXT_ACTIONS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "fulfilled", label: "Mark fulfilled", icon: "check_circle" },
  { status: "cancelled", label: "Cancel order", icon: "cancel" },
  { status: "refunded", label: "Mark refunded", icon: "currency_pound" },
];

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${SHOP_ADMIN_API}/orders/${id}`)
      .then((r) => r.json())
      .then((data) => setOrder(data?.id ? data : null))
      .finally(() => setLoading(false));
  }, [id]);

  async function setStatus(status: OrderStatus) {
    setBusy(true);
    try {
      const res = await fetch(`${SHOP_ADMIN_API}/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not update");
        return;
      }
      setOrder(data);
      toast.success(`Order marked ${ORDER_STATUS_LABELS[status].toLowerCase()}.`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoading label="Loading order" />;
  if (!order) return <p className="px-8 py-10 text-sm text-destiny-grey/50">Order not found.</p>;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
      <Link
        href="/admin/store/orders"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-destiny-grey/60 hover:text-destiny-grey"
      >
        <span className="material-symbols-rounded text-base">arrow_back</span>
        Orders
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-black text-destiny-grey">
            {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-destiny-grey/55">
            {new Date(order.created_at).toLocaleString("en-GB")}
          </p>
        </div>
        <span className="rounded-full bg-destiny-orange/10 px-3 py-1 text-xs font-bold text-destiny-orange">
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Customer */}
      <section className="mt-6 rounded-2xl border border-black/8 bg-white p-5">
        <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-destiny-grey/50">
          Customer
        </h2>
        <p className="font-bold text-destiny-grey">{order.customer_name}</p>
        <p className="text-sm text-destiny-grey/70">
          <a href={`mailto:${order.customer_email}`} className="hover:text-destiny-orange">
            {order.customer_email}
          </a>
        </p>
        {order.customer_phone && (
          <p className="text-sm text-destiny-grey/70">{order.customer_phone}</p>
        )}
        {order.notes && (
          <p className="mt-3 rounded-lg bg-[#f5f7fa] px-3 py-2 text-sm text-destiny-grey/70">
            <span className="font-bold">Note:</span> {order.notes}
          </p>
        )}
      </section>

      {/* Items */}
      <section className="mt-4 rounded-2xl border border-black/8 bg-white p-5">
        <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-destiny-grey/50">
          Items · collection at church
        </h2>
        <ul className="divide-y divide-black/8">
          {(order.items ?? []).map((item) => {
            const variant = [item.color, item.size].filter(Boolean).join(" / ");
            return (
              <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                <span className="text-destiny-grey">
                  <span className="font-bold">{item.product_name}</span>
                  {variant && <span className="text-destiny-grey/50"> ({variant})</span>}
                  <span className="text-destiny-grey/50"> × {item.quantity}</span>
                </span>
                <span className="font-semibold text-destiny-grey">
                  {formatPrice(item.unit_price_pennies * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-between border-t border-black/10 pt-3">
          <span className="font-black text-destiny-grey">Total</span>
          <span className="font-black text-destiny-grey">
            {formatPrice(order.total_pennies)}
          </span>
        </div>
      </section>

      {/* Actions */}
      <section className="mt-4 flex flex-wrap gap-2">
        {NEXT_ACTIONS.filter((a) => a.status !== order.status).map((a) => (
          <button
            key={a.status}
            type="button"
            disabled={busy}
            onClick={() => setStatus(a.status)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
              a.status === "fulfilled"
                ? "border-destiny-green/30 text-destiny-green hover:bg-destiny-green/10"
                : "border-black/10 text-destiny-grey hover:bg-[#f5f7fa]"
            }`}
          >
            <span className="material-symbols-rounded text-base">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </section>
    </div>
  );
}
