"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ShopHeroSlide } from "@/lib/shop";

const ROTATE_MS = 6000;

// Dynamic, admin-editable hero for /shop. Slides come from the shop_hero_slides
// table (see lib/shop.server.ts → getActiveShopHeroSlides). With 2+ slides it
// auto-rotates with a crossfade; it pauses on hover/focus and honours
// prefers-reduced-motion. The shop page only renders this when slides exist —
// otherwise it keeps the static "The Destiny Store" masthead.
export default function ShopHero({ slides }: { slides: ShopHeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const canRotate = slides.length > 1 && !reducedMotion && !paused;

  useEffect(() => {
    if (!canRotate) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      ROTATE_MS,
    );
    return () => clearInterval(t);
  }, [canRotate, slides.length]);

  // Keep the index in range if the slide count changes.
  useEffect(() => {
    if (index > slides.length - 1) setIndex(0);
  }, [slides.length, index]);

  const hoverHandlers = useRef({
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: () => setPaused(false),
  }).current;

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
                  <Link
                    href={slide.cta_link}
                    tabIndex={isActive ? 0 : -1}
                    className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:bg-destiny-orange-dark hover:brightness-110"
                  >
                    {slide.cta_text}
                    <span className="material-symbols-rounded text-lg">
                      arrow_forward
                    </span>
                  </Link>
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
