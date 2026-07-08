// Server-only data fetchers for the public /shop pages.
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Product, ProductVariant, ProductWithVariants } from "@/lib/shop";

// Order variants for display: colour, then size, then explicit sort order.
function sortVariants(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.color.localeCompare(b.color) ||
      a.size.localeCompare(b.size),
  );
}

/** All published products with their variants, ordered for the storefront grid. */
export async function getPublishedProducts(): Promise<ProductWithVariants[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPublishedProducts error:", error.message);
    return [];
  }
  return ((data ?? []) as ProductWithVariants[]).map((p) => ({
    ...p,
    variants: sortVariants(p.variants ?? []),
  }));
}

/** A single published product (with variants) by slug, or null. */
export async function getProductBySlug(
  slug: string,
): Promise<ProductWithVariants | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("getProductBySlug error:", error.message);
    return null;
  }
  if (!data) return null;
  const product = data as ProductWithVariants;
  return { ...product, variants: sortVariants(product.variants ?? []) };
}

/** Every product (published or draft) with variants — used by the admin list. */
export async function getAllProductsAdmin(): Promise<ProductWithVariants[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllProductsAdmin error:", error.message);
    return [];
  }
  return ((data ?? []) as ProductWithVariants[]).map((p) => ({
    ...p,
    variants: sortVariants(p.variants ?? []),
  }));
}

export type { Product, ProductVariant, ProductWithVariants };
