// Client-side cart, persisted to localStorage. The prices held here are for
// display only — the checkout API recomputes every amount from the DB, so a
// tampered cart can never change what the customer is charged.
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FREE_ITEM_LIMIT, freeUnits, type CartItem } from "@/lib/shop";

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (variantId: string) => void;
  setQty: (variantId: string, quantity: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => {
          // Free items are capped per person; the checkout enforces it too.
          if (item.unitPricePennies === 0) {
            const room = FREE_ITEM_LIMIT - freeUnits(state.items);
            if (room <= 0) return state;
            item = { ...item, quantity: Math.min(item.quantity, room) };
          }
          const existing = state.items.find(
            (i) => i.variantId === item.variantId,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      remove: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      setQty: (variantId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) => {
              if (i.variantId !== variantId) return i;
              let next = Math.max(1, Math.floor(quantity));
              if (i.unitPricePennies === 0) {
                const others = freeUnits(state.items) - i.quantity;
                next = Math.min(next, Math.max(1, FREE_ITEM_LIMIT - others));
              }
              return { ...i, quantity: next };
            })
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "destiny-cart" },
  ),
);

/** Total item count across all lines (for the header badge). */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Cart subtotal in pennies (display only). */
export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPricePennies * i.quantity, 0);
}
