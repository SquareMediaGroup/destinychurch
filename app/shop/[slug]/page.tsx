import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/shop.server";
import { fromPrice, formatPrice, FIT_LABELS } from "@/lib/shop";
import ProductGallery from "@/components/shop/ProductGallery";
import ProductBuyPanel from "@/components/shop/ProductBuyPanel";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const image = product.images[0]?.url;
  return {
    title: product.name,
    description:
      product.description?.slice(0, 160) ||
      `${product.name} — available from the Destiny Church store.`,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      title: `${product.name} | Destiny Church Store`,
      description: product.description?.slice(0, 160) || undefined,
      url: `https://destinytees.uk/shop/${product.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-destiny-grey">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(110% 60% at 100% -5%, rgba(245,128,33,0.07), transparent 60%), radial-gradient(90% 50% at -5% 100%, rgba(8,87,186,0.04), transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-10 sm:px-8 lg:pt-16">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-1.5 text-sm text-destiny-grey/50">
          <Link href="/shop" className="font-semibold transition hover:text-destiny-orange">
            Shop
          </Link>
          <span className="material-symbols-rounded text-base">chevron_right</span>
          <span className="truncate text-destiny-grey/70">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Gallery */}
          <div>
            <ProductGallery images={product.images} name={product.name} />
          </div>

          {/* Details */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-destiny-orange">
              {[FIT_LABELS[product.fit], product.category].filter(Boolean).join(" · ")}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-black leading-[1.05] text-destiny-grey sm:text-4xl">
              {product.name}
            </h1>

            <ProductBuyPanel product={product} />

            {product.description && (
              <div className="mt-10 border-t border-black/10 pt-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-destiny-grey/50">
                  Details
                </h2>
                <div
                  className="rte-content mt-3 text-sm leading-relaxed text-destiny-grey/70"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </div>
        </div>

        {/* JSON-LD for rich product results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.name,
              description: product.description || undefined,
              image: product.images.map((i) => i.url),
              offers: {
                "@type": "Offer",
                priceCurrency: "GBP",
                price: (fromPrice(product) / 100).toFixed(2),
                availability: "https://schema.org/InStock",
              },
            }),
          }}
        />
        <p className="sr-only">{formatPrice(fromPrice(product))}</p>
      </div>
    </div>
  );
}
