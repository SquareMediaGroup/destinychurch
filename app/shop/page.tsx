import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedProducts } from "@/lib/shop.server";
import ProductCard from "@/components/shop/ProductCard";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Destiny Church Tees Valley store — apparel and merch. Order online, collect at church.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop | Destiny Church Tees Valley",
    description: "Apparel and merch — order online, collect at church.",
    url: "https://destinytees.uk/shop",
  },
};

// Products change from the admin, so keep this fresh on a short revalidate.
export const revalidate = 60;

export default async function ShopPage() {
  const products = await getPublishedProducts();

  return (
    <div className="shop-page relative min-h-screen overflow-hidden bg-white text-destiny-grey">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .shop-page {
              background-color: #ffffff;
              background-image:
                radial-gradient(110% 60% at 100% -5%, rgba(245,128,33,0.08), transparent 60%),
                radial-gradient(90% 50% at -5% 100%, rgba(8,87,186,0.05), transparent 55%);
            }
            @keyframes shop-rise { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes shop-draw { from { transform: scaleX(0); } to { transform: scaleX(1); } }
            .shop-reveal { opacity: 0; animation: shop-rise 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
            .shop-rule { transform-origin: left; animation: shop-draw 0.9s cubic-bezier(0.16,1,0.3,1) forwards; }
            .shop-card {
              transition: transform 0.45s cubic-bezier(0.16,1,0.3,1), box-shadow 0.45s ease, border-color 0.45s ease;
            }
            .shop-card .shop-fill { transform: scaleY(0); transform-origin: bottom; transition: transform 0.5s cubic-bezier(0.16,1,0.3,1); }
            .shop-card:hover, .shop-card:focus-visible {
              transform: translateY(-6px);
              border-color: #f58021;
              box-shadow: 0 24px 50px -20px rgba(245,128,33,0.45);
            }
            .shop-card:hover .shop-fill, .shop-card:focus-visible .shop-fill { transform: scaleY(1); }
            .shop-card .shop-title, .shop-card .shop-price, .shop-card .shop-arrow {
              transition: color 0.4s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1);
            }
            .shop-card:hover .shop-title, .shop-card:focus-visible .shop-title { color: #ffffff; }
            .shop-card:hover .shop-price, .shop-card:focus-visible .shop-price { color: rgba(255,255,255,0.9); }
            .shop-card:hover .shop-arrow, .shop-card:focus-visible .shop-arrow { color: #ffffff; transform: translateX(6px); }
            @media (prefers-reduced-motion: reduce) {
              .shop-reveal, .shop-rule { animation: none; opacity: 1; transform: none; }
              .shop-card, .shop-card * { transition: none !important; }
            }
          `,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-16 sm:px-8 lg:pt-24">
        {/* Masthead */}
        <header className="mb-12 lg:mb-16">
          <h1 className="leading-[0.92]">
            <span
              className="shop-reveal block font-[family-name:var(--font-playfair)] text-4xl italic text-destiny-grey/80 sm:text-5xl"
              style={{ animationDelay: "0.05s" }}
            >
              The Destiny
            </span>
            <span
              className="shop-reveal mt-2 block font-[family-name:var(--font-anton)] text-[22vw] uppercase tracking-tight text-destiny-grey sm:mt-3 sm:text-[9.5rem] lg:text-[11.5rem]"
              style={{ animationDelay: "0.12s" }}
            >
              Store
            </span>
          </h1>
          <div
            className="shop-rule mt-8 h-1 w-24 rounded-full bg-destiny-orange"
            style={{ animationDelay: "0.2s" }}
          />
          <p
            className="shop-reveal mt-6 max-w-md text-base text-destiny-grey/60"
            style={{ animationDelay: "0.28s" }}
          >
            Wear the vision. Order online and collect at church — every purchase
            supports the mission.
          </p>
        </header>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="shop-reveal rounded-3xl border border-black/10 bg-white/60 p-14 text-center">
            <span className="material-symbols-rounded text-5xl text-destiny-grey/25">
              storefront
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-heading)] text-2xl font-black text-destiny-grey">
              Nothing in stock just yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-destiny-grey/55">
              New drops are on the way. Check back soon.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
            {products.map((product, i) => (
              <li
                key={product.id}
                className="shop-reveal"
                style={{ animationDelay: `${0.26 + i * 0.06}s` }}
              >
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <div className="shop-reveal mt-14 overflow-hidden rounded-3xl bg-destiny-grey px-7 py-10 sm:mt-20 sm:px-12 sm:py-12">
          <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-destiny-orange">
                Collection only
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-black text-white sm:text-3xl">
                Pick it up on a Sunday
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/60">
                Order online and grab your items next time you&apos;re in — we&apos;ll
                email you the moment they&apos;re ready to collect.
              </p>
            </div>
            <Link
              href="/visit"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.03] hover:bg-destiny-orange-dark"
            >
              Plan your visit
              <span className="material-symbols-rounded text-lg">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
