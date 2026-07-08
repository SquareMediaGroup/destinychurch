"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { formatPrice } from "@/lib/shop";

export default function CartPage() {
  const { items, setQty, remove } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const subtotal = cartSubtotal(items);

  return (
    <div className="relative min-h-screen bg-white text-destiny-grey">
      <div className="mx-auto max-w-4xl px-5 pb-28 pt-12 sm:px-8 lg:pt-16">
        <header className="mb-10">
          <p className="font-[family-name:var(--font-playfair)] text-2xl italic text-destiny-grey/70">
            Your
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-black uppercase tracking-tight text-destiny-grey sm:text-5xl">
            Basket
          </h1>
          <div className="mt-5 h-1 w-20 rounded-full bg-destiny-orange" />
        </header>

        {!mounted ? null : items.length === 0 ? (
          <div className="rounded-3xl border border-black/10 bg-[#f9fafb] p-14 text-center">
            <span className="material-symbols-rounded text-5xl text-destiny-grey/25">
              shopping_bag
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-heading)] text-2xl font-black text-destiny-grey">
              Your basket is empty
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-destiny-grey/55">
              Find something you love in the store.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white transition hover:bg-destiny-orange-dark"
            >
              Browse the store
              <span className="material-symbols-rounded text-lg">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_20rem]">
            {/* Line items */}
            <ul className="divide-y divide-black/8">
              {items.map((item) => {
                const variant = [item.color, item.size].filter(Boolean).join(" / ");
                return (
                  <li key={item.variantId} className="flex gap-4 py-5">
                    <Link
                      href={`/shop/${item.slug}`}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#f5f7fa]"
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="material-symbols-rounded absolute inset-0 m-auto h-fit w-fit text-2xl text-destiny-grey/20">
                          checkroom
                        </span>
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/shop/${item.slug}`}
                            className="font-[family-name:var(--font-heading)] font-black text-destiny-grey hover:text-destiny-orange"
                          >
                            {item.name}
                          </Link>
                          {variant && (
                            <p className="mt-0.5 text-sm text-destiny-grey/55">{variant}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.variantId)}
                          className="rounded-lg p-1.5 text-destiny-grey/40 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove item"
                        >
                          <span className="material-symbols-rounded text-lg">close</span>
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="inline-flex items-center rounded-full border border-black/15">
                          <button
                            type="button"
                            onClick={() => setQty(item.variantId, item.quantity - 1)}
                            className="flex h-9 w-9 items-center justify-center text-destiny-grey/70 hover:text-destiny-grey"
                            aria-label="Decrease quantity"
                          >
                            <span className="material-symbols-rounded text-base">remove</span>
                          </button>
                          <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQty(item.variantId, item.quantity + 1)}
                            className="flex h-9 w-9 items-center justify-center text-destiny-grey/70 hover:text-destiny-grey"
                            aria-label="Increase quantity"
                          >
                            <span className="material-symbols-rounded text-base">add</span>
                          </button>
                        </div>
                        <p className="font-bold text-destiny-grey">
                          {formatPrice(item.unitPricePennies * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Summary */}
            <aside className="h-fit rounded-3xl border border-black/10 bg-[#f9fafb] p-6 lg:sticky lg:top-24">
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-black text-destiny-grey">
                Summary
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-destiny-grey/60">Subtotal</dt>
                  <dd className="font-semibold">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-destiny-grey/60">Collection</dt>
                  <dd className="font-semibold text-destiny-green">Free</dd>
                </div>
              </dl>
              <div className="mt-4 flex justify-between border-t border-black/10 pt-4">
                <span className="font-black text-destiny-grey">Total</span>
                <span className="font-black text-destiny-grey">{formatPrice(subtotal)}</span>
              </div>
              <Link
                href="/shop/checkout"
                className="mt-6 flex items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white transition hover:bg-destiny-orange-dark"
              >
                Checkout
                <span className="material-symbols-rounded text-lg">lock</span>
              </Link>
              <Link
                href="/shop"
                className="mt-3 flex items-center justify-center gap-1 text-sm font-semibold text-destiny-grey/60 hover:text-destiny-grey"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
