// The wide banner above the What's On grid for the admin-featured event.
//
// Takes an already-merged ResolvedFeaturedEvent from lib/events.server.ts, so
// none of the "override, else feed" fallback logic lives here — this component
// only lays out what it is given, and renders nothing when the promotion is
// not live.

import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import type { ResolvedFeaturedEvent } from "@/lib/events.server";

export default function FeaturedEventHero({
  featured,
}: {
  featured: ResolvedFeaturedEvent | null;
}) {
  if (!featured) return null;

  const external = /^https?:\/\//i.test(featured.ctaLink);
  const meta = [featured.dateLine, featured.locationName]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="bg-white pt-10">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_12px_32px_-12px_rgba(16,24,40,.16)] md:grid md:grid-cols-2 md:items-stretch">
            {featured.imageUrl && (
              <div className="relative aspect-[16/10] w-full md:aspect-auto md:min-h-[320px]">
                <Image
                  src={featured.imageUrl}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="flex flex-col justify-center p-7 md:p-10">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-destiny-orange">
                Featured
              </p>
              <h2
                style={{ fontFamily: "var(--font-roboto)" }}
                className="mt-2 text-[28px] font-semibold leading-[1.12] tracking-[-0.022em] text-destiny-grey md:text-[34px]"
              >
                {featured.headline}
              </h2>
              {meta && (
                <p className="mt-2.5 text-sm font-semibold text-destiny-grey/55">
                  {meta}
                </p>
              )}
              {featured.blurb && (
                <p className="mt-3.5 max-w-prose text-[15px] leading-[1.55] text-destiny-grey/70">
                  {featured.blurb}
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-4">
                {external ? (
                  <a
                    href={featured.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
                  >
                    {featured.ctaText}
                  </a>
                ) : (
                  <Link
                    href={featured.ctaLink}
                    className="inline-flex items-center justify-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
                  >
                    {featured.ctaText}
                  </Link>
                )}
                {/* Always offer the on-site page, even when the CTA points at
                    ChurchSuite signup. */}
                {featured.slug && (
                  <Link
                    href={`/whats-on/${featured.slug}`}
                    className="text-sm font-semibold text-destiny-grey/60 underline underline-offset-4 transition hover:text-destiny-grey"
                  >
                    Event details
                  </Link>
                )}
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
