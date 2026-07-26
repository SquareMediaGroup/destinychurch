"use client";

// The rotating promo card that sits in a post's side margin.
//
// One tall 300x600 card per rail, cycling to the next item every 15 seconds.
// All data (including the gradient) is computed on the server and handed over as
// plain props — see components/posts/PostRails.tsx.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/** One promo panel. Serialisable so a server component can pass it straight in. */
export type PromoCard = {
  id: string;
  href: string;
  /** ChurchSuite events link off-site; courses are internal routes. */
  external: boolean;
  image?: string;
  title: string;
  description?: string;
  /** Pre-formatted on the server to avoid a locale mismatch on hydration. */
  dateStart?: string;
  dateEnd?: string;
  cta: string;
  gradient: string;
};

const ROTATE_MS = 15_000;

function CardBody({ card }: { card: PromoCard }) {
  return (
    <div
      className="flex h-[600px] w-[300px] flex-col overflow-hidden rounded-2xl p-6 text-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
      style={{ background: card.gradient }}
    >
      {card.dateStart ? (
        <div className="mb-5 text-[0.8rem] font-medium leading-snug text-white/75">
          <p>{card.dateStart}</p>
          {card.dateEnd ? <p>&rarr; {card.dateEnd}</p> : null}
        </div>
      ) : null}

      {card.image ? (
        <div className="relative mb-6 aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl">
          <Image
            src={card.image}
            alt=""
            fill
            sizes="252px"
            className="object-cover"
          />
        </div>
      ) : null}

      {/*
        Anton via inline style, not a font-* utility: globals.css has an
        unlayered `h1,h2,h3 { font-family: var(--font-heading) }` that outranks
        Tailwind's layered utilities. This matches HeroSection's approach. It is
        also a <p> rather than a heading so a promo panel never lands in the
        article's outline.
      */}
      <p
        className="text-[2.25rem] uppercase leading-[0.95] tracking-tight"
        style={{ fontFamily: "var(--font-anton)" }}
      >
        {card.title}
      </p>

      {card.description ? (
        <p className="mt-3 text-[0.9rem] leading-[1.45] text-white/90">
          {card.description}
        </p>
      ) : null}


      <span className="mt-auto inline-flex w-fit items-center rounded-full border border-white/30 bg-black/25 px-6 py-2.5 text-base font-bold uppercase tracking-wide backdrop-blur-sm transition group-hover:border-white/60 group-hover:bg-black/40">
        {card.cta}
      </span>
    </div>
  );
}

export default function PromoRail({
  side,
  label,
  cards,
}: {
  side: "left" | "right";
  label: string;
  cards: PromoCard[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (cards.length < 2 || paused) return;
    // Auto-rotating content is opt-out for anyone who asked for less motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(
      () => setIndex((i) => (i + 1) % cards.length),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [cards.length, paused]);

  if (cards.length === 0) return null;

  const card = cards[index % cards.length];
  const className =
    "group block transition-transform duration-300 hover:-translate-y-1";

  return (
    <aside
      aria-label={label}
      // Never rendered below the rail breakpoint. Deliberately NOT `self-start`:
      // the grid's default stretch makes this aside as tall as the article,
      // which is the room the sticky card needs to travel through. Shrinking it
      // to content height leaves zero range and sticky silently does nothing.
      className={[
        "hidden min-[1560px]:block min-[1560px]:row-start-1",
        side === "left" ? "min-[1560px]:col-start-1" : "min-[1560px]:col-start-3",
      ].join(" ")}
      // Hover/focus pause is the WCAG 2.2.2 escape hatch for moving content.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="sticky top-24">
        {/* Swapping content in place, so announce it politely rather than not at all. */}
        <div aria-live="polite" aria-atomic="true">
          {card.external ? (
            <a
              key={card.id}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              <CardBody card={card} />
            </a>
          ) : (
            <Link key={card.id} href={card.href} className={className}>
              <CardBody card={card} />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
