"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

const pillars = [
  {
    name: "Magnify",
    color: "#7A0404",
    icon: "/img/brand/5M_Icons_SVG/with coloured background/Magnify.svg",
    description:
      "The church exists to Worship God. We must love Him before working for Him. The supernatural intervention and leading of the Holy Spirit is essential in a healthy church.",
  },
  {
    name: "Mission",
    color: "#153560",
    icon: "/img/brand/5M_Icons_SVG/with coloured background/Mission.svg",
    description:
      "The church exists to communicate God's love and kindness and extend the community of believers in our community, County, Country and overseas.",
  },
  {
    name: "Ministry",
    color: "#3D1260",
    icon: "/img/brand/5M_Icons_SVG/with coloured background/Ministry.svg",
    description:
      "The church exists to demonstrate God's love to others by meeting their needs and healing their hurts in the name of Jesus, whether those needs are spiritual, emotional, relational or physical.",
  },
  {
    name: "Membership",
    color: "#7A3C08",
    icon: "/img/brand/5M_Icons_SVG/with coloured background/Membership.svg",
    description:
      "The church exists to provide fellowship, accountability and encouragement for believers. As Christians we are called to belong to Christ's family — not just believe.",
  },
  {
    name: "Maturity",
    color: "#073D1C",
    icon: "/img/brand/5M_Icons_SVG/with coloured background/Maturity.svg",
    description:
      "The church exists to help believers become more like Christ in their character, convictions, conduct and conversation. Growth is not optional — it is commanded by Jesus.",
  },
];

export default function MagnifySection() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === active) return;
      setAnimating(true);
      setTimeout(() => {
        setActive(index);
        setAnimating(false);
      }, 300);
    },
    [active, animating]
  );

  const next = useCallback(() => goTo((active + 1) % pillars.length), [active, goTo]);
  const prev = useCallback(() => goTo((active - 1 + pillars.length) % pillars.length), [active, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const pillar = pillars[active];

  return (
    <section id="pillars" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Our Five Pillars
          </p>
          <h2 className="mb-10 text-center text-3xl font-black text-destiny-grey md:text-4xl">
            What We Stand For
          </h2>
        </AnimateIn>

        {/* Slide */}
        <div
          className="relative overflow-hidden rounded-3xl transition-colors duration-500"
          style={{ background: pillar.color }}
        >
          <div
            className={`flex flex-col items-center justify-center gap-8 px-8 py-12 transition-opacity duration-300 md:flex-row md:gap-16 md:px-16 ${
              animating ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="mx-auto flex flex-col items-center gap-8 md:flex-row md:gap-16">
            {/* Icon */}
            <div className="shrink-0">
              <Image
                src={pillar.icon}
                alt={pillar.name}
                width={160}
                height={160}
                className="h-36 w-36 md:h-44 md:w-44"
              />
            </div>

            {/* Text */}
            <div>
              <h3 className="mb-4 text-5xl font-black text-white md:text-6xl">
                {pillar.name}
              </h3>
              <p className="max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
                {pillar.description}
              </p>
            </div>
            </div>
          </div>

          {/* Prev / Next arrows */}
          <button
            onClick={prev}
            aria-label="Previous pillar"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 backdrop-blur-sm transition hover:bg-white/30"
          >
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Next pillar"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 backdrop-blur-sm transition hover:bg-white/30"
          >
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Dots */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {pillars.map((p, i) => (
            <button
              key={p.name}
              onClick={() => goTo(i)}
              aria-label={`Go to ${p.name}`}
              className="h-2.5 rounded-full transition-all duration-300"
              style={{
                width: i === active ? "2rem" : "0.625rem",
                background: i === active ? p.color : "#d1d5db",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
