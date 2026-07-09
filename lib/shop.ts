// Shared types and helpers for the shop module.
// Client-safe (no server-only imports) — used by admin client pages, the public
// storefront, and the cart store alike. Server-side data fetchers live in
// `lib/shop.server.ts`. Prices are integer pennies (GBP) everywhere.

export type OrderStatus =
  | "pending"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

// Who a product is cut for. Male/Female/Unisex are adult fits (shared size
// chart); Kids uses age-based sizes.
export type Fit = "male" | "female" | "unisex" | "kids";

export const FIT_LABELS: Record<Fit, string> = {
  male: "Men's",
  female: "Women's",
  unisex: "Unisex",
  kids: "Kids",
};

export const FIT_OPTIONS: Fit[] = ["male", "female", "unisex", "kids"];

// Controlled size charts — the admin can only pick from these, so no typos or
// sizes that don't exist. Ordered smallest → largest for display + sort_order.
export const ADULT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
export const KIDS_SIZES = [
  "2-3y",
  "3-4y",
  "5-6y",
  "7-8y",
  "9-10y",
  "11-12y",
  "13-14y",
] as const;

/** The size options a given fit allows. */
export function sizesForFit(fit: Fit): readonly string[] {
  return fit === "kids" ? KIDS_SIZES : ADULT_SIZES;
}

// Full ordering used to sort sizes for display regardless of fit.
const SIZE_ORDER: string[] = [...ADULT_SIZES, ...KIDS_SIZES];

/** Sort index for a size label (unknown sizes sort last, alphabetically). */
export function sizeIndex(size: string): number {
  const i = SIZE_ORDER.indexOf(size);
  return i === -1 ? SIZE_ORDER.length : i;
}

export interface ProductImage {
  url: string;
  path: string; // storage path in the product-images bucket
  alt: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  color_hex: string | null;
  sku: string | null;
  price_pennies: number | null; // null → inherit product base price
  stock: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  base_price_pennies: number;
  category: string | null;
  fit: Fit;
  images: ProductImage[];
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  size: string | null;
  color: string | null;
  unit_price_pennies: number;
  quantity: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  stripe_payment_intent_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  status: OrderStatus;
  fulfillment_method: string;
  subtotal_pennies: number;
  total_pennies: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// A single line the browser keeps in the cart and posts to checkout. Prices here
// are for display only — the server recomputes them from the DB at checkout.
export interface CartItem {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  size: string;
  color: string;
  colorHex: string | null;
  unitPricePennies: number;
  image: string | null;
  quantity: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

// Tone tokens matching the admin badge palette (see APPLICATION_STATUS_TONE).
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  pending: "orange",
  paid: "blue",
  fulfilled: "green",
  cancelled: "red",
  refunded: "grey",
};

/** Format integer pennies as a GBP price string, e.g. 1200 → "£12.00". */
export function formatPrice(pennies: number, currency = "gbp"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(pennies / 100);
}

/** The effective price of a variant: its override, else the product base price. */
export function variantPrice(
  variant: Pick<ProductVariant, "price_pennies">,
  product: Pick<Product, "base_price_pennies">,
): number {
  return variant.price_pennies ?? product.base_price_pennies;
}

/** Lowest in-stock price across a product's variants, for "from £x" display. */
export function fromPrice(product: ProductWithVariants): number {
  const active = product.variants.filter((v) => v.is_active);
  if (active.length === 0) return product.base_price_pennies;
  return Math.min(...active.map((v) => variantPrice(v, product)));
}

/** Total stock across a product's active variants. */
export function totalStock(product: ProductWithVariants): number {
  return product.variants
    .filter((v) => v.is_active)
    .reduce((sum, v) => sum + Math.max(0, v.stock), 0);
}

export const SHOP_ADMIN_API = "/api/admin/store";
