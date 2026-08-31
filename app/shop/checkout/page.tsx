"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe, type Appearance } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { formatPrice } from "@/lib/shop";
import CheckoutForm from "@/components/shop/CheckoutForm";

// Load Stripe once. Missing key → null (we surface a friendly message).
const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<Stripe | null> | null = pubKey
  ? loadStripe(pubKey)
  : null;

const appearance: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#f58021",
    colorText: "#363f48",
    colorDanger: "#fd0000",
    borderRadius: "12px",
    fontFamily: "Roboto, system-ui, sans-serif",
  },
};

type Customer = { name: string; email: string; phone: string; notes: string };

const TEST_BYPASS = process.env.NEXT_PUBLIC_SHOP_TEST_BYPASS === "1";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);

  async function startPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customer.name.trim() || !customer.email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    if (items.length === 0) {
      setError("Your basket is empty.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          customer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setClientSecret(data.clientSecret);
      setOrderNumber(data.orderNumber);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // TEST ONLY — completes the order without Stripe (server-gated by
  // SHOP_TEST_BYPASS). Lets us walk the full flow up to the success screen.
  async function completeTestOrder() {
    setError(null);
    if (!customer.name.trim() || !customer.email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/store/checkout/bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          customer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Test order failed.");
        return;
      }
      clear();
      router.push(
        `/shop/checkout/success?order=${encodeURIComponent(data.orderNumber)}&redirect_status=succeeded`,
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Cart is a localStorage-backed store, so it's empty during SSR and the
  // first client render — wait for it to hydrate before rendering anything
  // that depends on `items`, or the order summary will mismatch/flash.
  if (!mounted) {
    return null;
  }

  // Empty basket (and not already in a payment) → nudge back to the shop.
  if (items.length === 0 && !clientSecret) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-black text-destiny-grey">
          Your basket is empty
        </h1>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white transition hover:bg-destiny-orange-dark"
        >
          Browse the store
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-destiny-grey">
      <div className="mx-auto max-w-4xl px-5 pb-28 pt-12 sm:px-8 lg:pt-16">
        <header className="mb-10">
          <p className="font-[family-name:var(--font-playfair)] text-2xl italic text-destiny-grey/70">
            Secure
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-black uppercase tracking-tight text-destiny-grey sm:text-5xl">
            Checkout
          </h1>
          <div className="mt-5 h-1 w-20 rounded-full bg-destiny-orange" />
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_18rem]">
          <div>
            {!clientSecret ? (
              /* Step 1 — contact details */
              <form onSubmit={startPayment} className="space-y-5">
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-black text-destiny-grey">
                  Your details
                </h2>
                <Field
                  label="Full name"
                  required
                  value={customer.name}
                  onChange={(v) => setCustomer((c) => ({ ...c, name: v }))}
                />
                <Field
                  label="Email"
                  type="email"
                  required
                  value={customer.email}
                  onChange={(v) => setCustomer((c) => ({ ...c, email: v }))}
                />
                <Field
                  label="Phone (optional)"
                  type="tel"
                  value={customer.phone}
                  onChange={(v) => setCustomer((c) => ({ ...c, phone: v }))}
                />
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-destiny-grey/50">
                    Order notes (optional)
                  </label>
                  <textarea
                    value={customer.notes}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, notes: e.target.value }))
                    }
                    rows={3}
                    placeholder="Anything we should know for collection?"
                    className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-4 text-sm font-bold text-white transition hover:bg-destiny-orange-dark disabled:bg-destiny-grey/30"
                >
                  {loading ? "Starting…" : "Continue to payment"}
                  <span className="material-symbols-rounded text-lg">arrow_forward</span>
                </button>

                {TEST_BYPASS && (
                  <button
                    type="button"
                    onClick={completeTestOrder}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-destiny-grey/30 px-7 py-3 text-sm font-bold text-destiny-grey/70 transition hover:border-destiny-grey/50 hover:text-destiny-grey disabled:opacity-50"
                  >
                    <span className="material-symbols-rounded text-lg">science</span>
                    Complete test order (skip payment)
                  </button>
                )}
              </form>
            ) : stripePromise ? (
              /* Step 2 — payment */
              <div>
                <h2 className="mb-5 font-[family-name:var(--font-heading)] text-lg font-black text-destiny-grey">
                  Payment
                </h2>
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret, appearance }}
                >
                  <CheckoutForm
                    orderNumber={orderNumber!}
                    totalPennies={subtotal}
                  />
                </Elements>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Payments aren&apos;t configured yet. Please try again later.
              </div>
            )}
          </div>

          {/* Order summary */}
          <aside className="h-fit rounded-3xl border border-black/10 bg-[#f9fafb] p-6 lg:sticky lg:top-24">
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-black text-destiny-grey">
              Order
            </h2>
            <ul className="mt-4 space-y-3">
              {items.map((i) => (
                <li key={i.variantId} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 text-destiny-grey/70">
                    <span className="font-semibold text-destiny-grey">{i.name}</span>
                    {[i.color, i.size].filter(Boolean).length > 0 && (
                      <span className="text-destiny-grey/50">
                        {" "}
                        ({[i.color, i.size].filter(Boolean).join(" / ")})
                      </span>
                    )}
                    <span className="text-destiny-grey/50"> × {i.quantity}</span>
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatPrice(i.unitPricePennies * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-black/10 pt-4">
              <span className="font-black text-destiny-grey">Total</span>
              <span className="font-black text-destiny-grey">{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-destiny-grey/50">
              <span className="material-symbols-rounded text-sm">storefront</span>
              Collection at church
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-destiny-grey/50">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
      />
    </div>
  );
}
