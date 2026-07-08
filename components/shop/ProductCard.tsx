import Link from "next/link";
import Image from "next/image";
import { fromPrice, formatPrice, totalStock, type ProductWithVariants } from "@/lib/shop";

// A single storefront product tile. Hover styles (`.shop-card`, `.shop-fill`,
// `.shop-*`) are defined in the page-scoped <style> on /shop, mirroring the
// editorial step-card on /links.
export default function ProductCard({ product }: { product: ProductWithVariants }) {
  const image = product.images[0];
  const price = fromPrice(product);
  const multiPrice =
    product.variants.some((v) => v.price_pennies !== null) &&
    new Set(
      product.variants
        .filter((v) => v.is_active)
        .map((v) => v.price_pennies ?? product.base_price_pennies),
    ).size > 1;
  const soldOut = totalStock(product) <= 0;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="shop-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white outline-none"
    >
      <span aria-hidden className="shop-fill absolute inset-0 bg-destiny-orange" />

      <div className="relative aspect-square overflow-hidden bg-[#f5f7fa]">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="material-symbols-rounded text-4xl text-destiny-grey/20">
              checkroom
            </span>
          </div>
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-destiny-grey/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Sold out
          </span>
        )}
        {product.category && (
          <span className="shop-cat absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-destiny-grey/70">
            {product.category}
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col p-5">
        <h3 className="shop-title font-[family-name:var(--font-heading)] text-lg font-black leading-tight text-destiny-grey">
          {product.name}
        </h3>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="shop-price text-sm font-bold text-destiny-orange">
            {multiPrice ? "from " : ""}
            {formatPrice(price)}
          </p>
          <span className="material-symbols-rounded shop-arrow text-2xl text-destiny-grey/40">
            arrow_forward
          </span>
        </div>
      </div>
    </Link>
  );
}
