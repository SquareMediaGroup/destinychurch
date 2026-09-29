"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { ShopHeroSlide } from "@/lib/shop";
import { useMediaQuery } from "@/lib/useMediaQuery";
import Button from "@/components/ui/Button";

const ROTATE_MS = 6000;

// Dynamic, admin-editable hero for /shop. Slides come from the shop_hero_slides
// table (see lib/shop.server.ts → getActiveShopHeroSlides). With 2+ slides it
// auto-rotates with a crossfade; it pauses on hover/focus and honours
// prefers-reduced-motion. The shop page only renders this when slides exist —
// otherwise it keeps the static "The Destiny Store" masthead.
export default function ShopHero({ slides }: { slides: ShopHeroSlide[] }) {
  const [rawIndex, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Clamped here rather than corrected by an effect: if an admin removes the
  // slide we are sitting on, an effect would paint one blank frame first.
  const index = rawIndex < slides.length ? rawIndex : 0;

  const canRotate = slides.length > 1 && !reducedMotion && !paused;

  useEffect(() => {
    if (!canRotate) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      ROTATE_MS,
    );
    return () => clearInterval(t);
  }, [canRotate, slides.length]);

  // A stable object so spreading it onto <section> doesn't hand React four new
  // handler identities every render. useMemo, not useRef().current — reading a
  // ref during render is what React's rules of hooks rule out.
  const hoverHandlers = useMemo(
    () => ({
      onMouseEnter: () => setPaused(true),
      onMouseLeave: () => setPaused(false),
      onFocusCapture: () => setPaused(true),
      onBlurCapture: () => setPaused(false),
    }),
    [],
  );

  return (
    <section
      className="relative mb-12 overflow-hidden rounded-3xl bg-destiny-grey lg:mb-16"
      aria-roledescription="carousel"
      aria-label="Shop highlights"
      {...hoverHandlers}
    >
      <div className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[540px]">
        {slides.map((slide, i) => {
          const isActive = i === index;
          return (
            <div
              key={slide.id}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{ opacity: isActive ? 1 : 0 }}
              aria-hidden={!isActive}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
            >
              {slide.image_url && (
                <Image
                  src={slide.image_url}
                  alt=""
                  aria-hidden
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 1152px"
                  className="object-cover object-center"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/75" />

              <div className="relative flex min-h-[420px] flex-col justify-end gap-4 p-7 sm:min-h-[480px] sm:p-10 lg:min-h-[540px] lg:p-14">
                {slide.heading && (
                  <h1
                    className="max-w-2xl text-[13vw] uppercase leading-[0.9] tracking-tight text-white sm:text-6xl lg:text-7xl"
                    style={{ fontFamily: "var(--font-anton)" }}
                  >
                    {slide.heading}
                  </h1>
                )}
                {slide.subheading && (
                  <p className="max-w-lg text-base text-white/80 sm:text-lg">
                    {slide.subheading}
                  </p>
                )}
                {slide.cta_text && slide.cta_link && (
                  <Button
                    href={slide.cta_link}
                    tabIndex={isActive ? 0 : -1}
                    size="xl"
                    className="mt-1 w-fit"
                  >
                    {slide.cta_text}
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">
                      arrow_forward
                    </span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-5 right-6 z-10 flex items-center gap-2 sm:bottom-6 sm:right-10 lg:right-14">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-2.5 rounded-full transition-all ${
                  i === index
                    ? "w-7 bg-destiny-orange"
                    : "w-2.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
