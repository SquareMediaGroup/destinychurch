"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart-store";

function SuccessInner() {
  const params = useSearchParams();
  const orderNumber = params.get("order");
  const redirectStatus = params.get("redirect_status");
  const clear = useCart((s) => s.clear);

  // Stripe (and our test-bypass route) always append redirect_status on
  // redirect — a missing param means this URL wasn't reached via a real
  // payment redirect (e.g. bookmarked/shared), so don't treat it as success.
  const succeeded = redirectStatus === "succeeded";

  // Clear the basket once payment has gone through.
  useEffect(() => {
    if (succeeded) clear();
  }, [succeeded, clear]);

  if (!succeeded) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <span className="material-symbols-rounded text-6xl text-destiny-red">error</span>
        <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-black text-destiny-grey">
          Payment not completed
        </h1>
        <p className="mt-2 text-sm text-destiny-grey/60">
          Your payment didn&apos;t go through. Your basket is still saved.
        </p>
        <Link
          href="/shop/checkout"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white transition hover:bg-destiny-orange-dark"
        >
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destiny-green/10">
        <span className="material-symbols-rounded text-4xl text-destiny-green">
          check_circle
        </span>
      </div>
      <p className="mt-6 font-[family-name:var(--font-playfair)] text-2xl italic text-destiny-grey/70">
        Thank you
      </p>
      <h1 className="font-[family-name:var(--font-heading)] text-4xl font-black uppercase tracking-tight text-destiny-grey">
        Order confirmed
      </h1>
      {orderNumber && (
        <p className="mt-3 text-sm text-destiny-grey/60">
          Order reference{" "}
          <span className="font-bold text-destiny-grey">{orderNumber}</span>
        </p>
      )}
      <div className="mt-8 rounded-2xl border border-black/10 bg-[#f9fafb] p-6 text-left">
        <p className="flex items-start gap-2 text-sm text-destiny-grey/70">
          <span className="material-symbols-rounded text-lg text-destiny-orange">mail</span>
          We&apos;ve emailed you a confirmation. Keep an eye on your inbox — we&apos;ll
          let you know as soon as your order is ready to collect at church.
        </p>
      </div>
      <Link
        href="/shop"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white transition hover:bg-destiny-orange-dark"
      >
        Continue shopping
        <span className="material-symbols-rounded text-lg">arrow_forward</span>
      </Link>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<div className="py-24 text-center text-destiny-grey/50">Loading…</div>}>
        <SuccessInner />
      </Suspense>
    </div>
  );
}
