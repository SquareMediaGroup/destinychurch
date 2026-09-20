"use client";

import Link from "next/link";
import { useCart, cartCount } from "@/lib/cart-store";
import { useHydrated } from "@/lib/useHydrated";

// Header basket link with a live item-count badge. The count only renders after
// mount to avoid a hydration mismatch (the cart lives in localStorage).
export default function CartButton({ className = "" }: { className?: string }) {
  const items = useCart((s) => s.items);
  const mounted = useHydrated();

  const count = mounted ? cartCount(items) : 0;

  if (!count) return null;

  return (
    <Link
      href="/shop/cart"
      aria-label={`Basket, ${count} item${count === 1 ? "" : "s"}`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-destiny-orange ${className}`}
    >
      <span className="material-symbols-rounded text-[22px]" aria-hidden="true">shopping_bag</span>
      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destiny-orange px-1 text-[11px] font-bold text-white">
        {count}
      </span>
    </Link>
  );
}
