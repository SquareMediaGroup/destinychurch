import { test, expect } from "@playwright/test";
import { useCart } from "../../lib/cart-store";
import { FREE_ITEM_LIMIT, freeUnits, type CartItem } from "../../lib/shop";

/**
 * Free items are limited to one per person. The checkout enforces it on the
 * server; the basket mirrors it so nobody reaches checkout with a basket that
 * will be turned away.
 */
function item(variantId: string, unitPricePennies: number, quantity = 1): CartItem {
  return {
    productId: `p-${variantId}`,
    variantId,
    slug: variantId,
    name: variantId,
    size: "",
    color: "",
    colorHex: null,
    unitPricePennies,
    image: null,
    quantity,
  };
}

test.beforeEach(() => useCart.getState().clear());

test("limit is one", () => {
  expect(FREE_ITEM_LIMIT).toBe(1);
});

test("freeUnits counts only price-0 units", () => {
  expect(freeUnits([item("a", 0, 2), item("b", 1500, 3)])).toBe(2);
});

test("adding several of a free item keeps one", () => {
  useCart.getState().add(item("free", 0, 3));
  expect(useCart.getState().items).toEqual([item("free", 0, 1)]);
});

test("a second free item is not added", () => {
  useCart.getState().add(item("free-a", 0));
  useCart.getState().add(item("free-b", 0));
  useCart.getState().add(item("free-a", 0));
  expect(useCart.getState().items.map((i) => [i.variantId, i.quantity])).toEqual([["free-a", 1]]);
});

test("free quantity cannot be raised, paid quantity can", () => {
  useCart.getState().add(item("free", 0));
  useCart.getState().add(item("paid", 1500));
  useCart.getState().setQty("free", 4);
  useCart.getState().setQty("paid", 4);
  expect(useCart.getState().items.map((i) => [i.variantId, i.quantity])).toEqual([
    ["free", 1],
    ["paid", 4],
  ]);
});
