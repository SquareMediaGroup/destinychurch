"use client";

// The rotating promo card that sits in a post's side margin.
//
// One tall 300x600 card per rail, cycling to the next item every 15 seconds.
// All data (including the palette) is computed on the server and handed over as
// plain props — see components/posts/PostRails.tsx.
//
// The card is deliberately light. An earlier version filled it with a dark
// gradient sampled from the artwork, which made two 300x600 slabs the heaviest
// thing on the page and pulled the eye away from the article. Now the sampled
// colour survives only as a near-white tint, a hairline border and the CTA fill,
// so the artwork provides the colour and the centre column keeps the focus.

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
  /** "H S%" sampled from the artwork — the card supplies its own lightness. */
  accent: string;
};

const ROTATE_MS = 15_000;

function CardBody({ card }: { card: PromoCard }) {
  // One hue+saturation pair drives the whole card.
  const tint = `hsl(${card.accent} 97%)`;
  const border = `hsl(${card.accent} 88%)`;
  const accent = `hsl(${card.accent} 30%)`;

  return (
    <div
      className="flex h-[600px] w-[300px] flex-col overflow-hidden rounded-2xl border p-6 shadow-[0_1px_10px_rgba(0,0,0,0.04)] transition-shadow duration-300 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      style={{ backgroundColor: tint, borderColor: border }}
    >
      {card.dateStart ? (
        <div className="mb-5 text-[0.8rem] font-medium leading-snug text-destiny-grey/55">
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
        className="text-[2.25rem] uppercase leading-[0.95] tracking-tight text-destiny-grey"
        style={{ fontFamily: "var(--font-anton)" }}
      >
        {card.title}
      </p>

      {card.description ? (
        <p className="mt-3 text-[0.9rem] leading-[1.45] text-destiny-grey/70">
          {card.description}
        </p>
      ) : null}

      <span
        className="mt-auto inline-flex w-fit items-center rounded-full px-6 py-2.5 text-base font-bold uppercase tracking-wide text-white transition-transform duration-300 group-hover:scale-[1.03]"
        style={{ backgroundColor: accent }}
      >
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

  const active = index % cards.length;

  return (
    <aside
      aria-label={label}
      // Never rendered below the rail breakpoint. Deliberately NOT `self-start`:
      // the grid's default stretch makes this aside as tall as the article,
      // which is the room the sticky card needs to travel through. Shrinking it
      // to content height leaves zero range and sticky silently does nothing.
      className={[
        "hidden min-[1600px]:block min-[1600px]:row-start-1",
        side === "left" ? "min-[1600px]:col-start-1" : "min-[1600px]:col-start-3",
      ].join(" ")}
      // Hover/focus pause is the WCAG 2.2.2 escape hatch for moving content.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="sticky top-24">
        {/*
          Every card is mounted and crossfaded rather than swapped in and out.
          Mounting only the active one meant each rotation inserted a fresh <img>
          that began loading from scratch, so the artwork flashed blank for a beat
          every 15s. Mounting them all loads the images once, up front.

          Inactive cards are hidden from assistive tech and taken out of the tab
          order, so only the visible card is reachable.
        */}
        <div className="relative h-[600px] w-[300px]">
          {cards.map((card, i) => {
            const isActive = i === active;
            // The swap is instant, deliberately. A cross-fade double-exposed two
            // opaque text-bearing cards (you read both titles at 50%), and fading
            // the incoming card up from 0 left it stranded invisible when a
            // background tab throttled the transition. An instant swap has
            // neither failure mode — and unannounced motion in the page margins
            // pulls the eye away from the article, which is the opposite of what
            // these rails are for. The hover lift stays: that one is user-driven.
            const className = [
              "group absolute inset-0 block transition-transform duration-300",
              isActive
                ? "opacity-100 hover:-translate-y-1"
                : "pointer-events-none opacity-0",
            ].join(" ");

            const shared = {
              className,
              "aria-hidden": !isActive,
              tabIndex: isActive ? undefined : -1,
            };

            return card.external ? (
              <a
                key={card.id}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                {...shared}
              >
                <CardBody card={card} />
              </a>
            ) : (
              <Link key={card.id} href={card.href} {...shared}>
                <CardBody card={card} />
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
