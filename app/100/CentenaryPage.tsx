"use client";

/* eslint-disable @next/next/no-img-element */

import { Fragment, useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

/* ------------------------------------------------------------------ *
 * Centenary landing page — "100 Years of Destiny Church"
 *
 * A deliberately distinct, cinematic dark page that does NOT match the
 * rest of the white/orange site. Built on the Destiny brand language:
 *   - Bison-substitute display type (Anton, already loaded globally)
 *   - The five-pillar rainbow gradient (the logo's own colours)
 *   - Butterfly / metamorphosis motif + dotted-grid texture
 *   - Real church photography
 *
 * NOTE: All historical copy/dates below are PLACEHOLDER. Swap for the
 * church's real centenary timeline, milestones and photos before launch.
 * ------------------------------------------------------------------ */

// Destiny pillar palette
const RAINBOW = "#F58021 0%, #FD0000 26%, #8106B1 50%, #0857BA 74%, #028002 100%";
const INK = "#0B0D11";
const LIGHT = "#E8EAEE";
const MUTED = "rgba(232, 234, 238, 0.62)";
const ORANGE = "#F58021";

const DISPLAY: CSSProperties = { fontFamily: "var(--font-anton), Impact, sans-serif" };

const gradientText: CSSProperties = {
  backgroundImage: `linear-gradient(102deg, ${RAINBOW})`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

const dotGrid: CSSProperties = {
  backgroundImage:
    "radial-gradient(rgba(255,255,255,0.10) 1.1px, transparent 1.1px)",
  backgroundSize: "22px 22px",
};

const EASE = [0.25, 0.1, 0.25, 1] as const;

/* ----------------------------- helpers ----------------------------- */

function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "50px", amount: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Mouse-following magnetic hover effect. */
function Magnet({
  children,
  padding = 150,
  strength = 3,
  className,
}: {
  children: ReactNode;
  padding?: number;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const handle = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const within =
        Math.abs(dx) < r.width / 2 + padding &&
        Math.abs(dy) < r.height / 2 + padding;
      if (within) {
        setActive(true);
        setPos({ x: dx / strength, y: dy / strength });
      } else if (active) {
        setActive(false);
        setPos({ x: 0, y: 0 });
      }
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, [padding, strength, active]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: active
          ? "transform 0.3s ease-out"
          : "transform 0.6s ease-in-out",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

function CelebrateButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/give"
      className={`inline-block rounded-full px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] text-white transition-transform duration-200 hover:scale-[1.03] sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base ${className}`}
      style={{
        background: `linear-gradient(123deg, ${RAINBOW})`,
        boxShadow:
          "0px 4px 4px rgba(245,128,33,0.25), 4px 4px 12px rgba(129,6,177,0.55) inset",
        outline: "2px solid #fff",
        outlineOffset: "-3px",
      }}
    >
      Celebrate With Us
    </Link>
  );
}

function GhostButton({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border-2 px-7 py-2.5 text-xs font-medium uppercase tracking-[0.2em] transition-colors duration-200 sm:px-9 sm:py-3 sm:text-sm ${className}`}
      style={{ borderColor: LIGHT, color: LIGHT }}
    >
      {label}
    </span>
  );
}

/* ----------------------------- 1. HERO ----------------------------- */

function HeroSection() {
  return (
    <section
      className="relative flex h-screen min-h-[640px] flex-col"
      style={{ overflowX: "clip" }}
    >
      {/* atmospheric rainbow glow + dotted texture */}
      <div className="pointer-events-none absolute inset-0 z-0" style={dotGrid} />
      <div
        className="pointer-events-none absolute left-1/2 top-[44%] z-0 h-[72vmin] w-[72vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[90px]"
        style={{ background: `conic-gradient(from 90deg, ${RAINBOW})` }}
      />

      {/* Navbar */}
      <FadeIn delay={0} y={-20} className="relative z-20">
        <nav className="flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8">
          <img
            src="/img/brand/destiny-logo-color-white.svg"
            alt="Destiny Church"
            className="hidden h-7 w-auto sm:block sm:h-8 md:h-9"
          />
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-8 md:gap-10">
            {[
              ["Story", "#story"],
              ["Milestones", "#milestones"],
              ["Chapters", "#chapters"],
              ["Give", "/give"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="text-[11px] font-medium uppercase tracking-normal transition-opacity duration-200 hover:opacity-70 sm:text-sm sm:tracking-wider md:text-lg lg:text-[1.4rem]"
                style={{ color: "#D7E2EA" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </FadeIn>

      {/* Hero heading */}
      <div className="relative z-10 flex flex-1 flex-col justify-end px-6 md:px-10">
        <FadeIn delay={0.1} y={0} className="relative z-20">
          <p
            className="mb-2 text-[3.2vw] font-medium uppercase tracking-[0.35em] sm:text-base md:text-lg"
            style={{ color: ORANGE }}
          >
            Est. 1926 — Norton Road
          </p>
        </FadeIn>

        <div className="overflow-hidden">
          <FadeIn delay={0.15} y={40}>
            <h1
              className="w-full whitespace-nowrap text-[15.5vw] uppercase leading-[0.82] tracking-tight sm:text-[16vw] md:text-[17vw] lg:text-[18vw]"
              style={{ ...DISPLAY, ...gradientText }}
            >
              One Hundred
            </h1>
          </FadeIn>
        </div>

        {/* Bottom bar */}
        <div className="flex items-end justify-between pb-7 sm:pb-8 md:pb-10">
          <FadeIn delay={0.35} y={20}>
            <p
              className="max-w-[180px] font-light uppercase leading-snug tracking-wide sm:max-w-[240px] md:max-w-[300px]"
              style={{
                color: "#D7E2EA",
                fontSize: "clamp(0.75rem, 1.4vw, 1.5rem)",
              }}
            >
              A century of faith, hope &amp; love — transforming lives across the
              Tees Valley.
            </p>
          </FadeIn>
          <FadeIn delay={0.5} y={20}>
            <CelebrateButton />
          </FadeIn>
        </div>
      </div>

      {/* Centered magnetic butterfly mark — floats behind the headline */}
      <FadeIn
        delay={0.6}
        y={30}
        className="absolute left-1/2 top-[44%] z-[5] -translate-x-1/2 -translate-y-1/2"
      >
        <Magnet padding={150} strength={3}>
          <img
            src="/img/brand/destiny-icon.svg"
            alt="Destiny Church butterfly mark"
            className="w-[200px] drop-shadow-[0_20px_60px_rgba(129,6,177,0.45)] sm:w-[260px] md:w-[320px] lg:w-[380px]"
          />
        </Magnet>
      </FadeIn>
    </section>
  );
}

/* --------------------------- 2. MARQUEE ---------------------------- */

const GALLERY = [
  "Community",
  "WorshipMoment",
  "SingingLand",
  "Speaker",
  "YouthCommunity",
  "OlderPeople",
  "FamilySatTogether",
  "Photography",
  "SingingLand2",
  "Community2",
  "SingingPort",
  "Speaker2",
  "SingingLand3",
  "WorshipMoment3",
  "SingingLand4",
].map((n) => `/img/photos/Gallery/${n}.webp`);

function MarqueeSection() {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setOffset((window.scrollY - top + window.innerHeight) * 0.3);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const row1 = [...GALLERY.slice(0, 8), ...GALLERY.slice(0, 8), ...GALLERY.slice(0, 8)];
  const row2 = [...GALLERY.slice(8), ...GALLERY.slice(8), ...GALLERY.slice(8)];

  const Tile = ({ src }: { src: string }) => (
    <div className="h-[180px] w-[280px] shrink-0 overflow-hidden rounded-2xl sm:h-[230px] sm:w-[360px] md:h-[270px] md:w-[420px]">
      <img
        src={src}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  );

  return (
    <section
      ref={ref}
      className="overflow-hidden pb-10 pt-24 sm:pt-32 md:pt-40"
      style={{ background: INK }}
    >
      <div className="flex flex-col gap-3">
        <div
          className="flex gap-3"
          style={{
            transform: `translateX(${offset - 200}px)`,
            willChange: "transform",
          }}
        >
          {row1.map((src, i) => (
            <Tile key={`a${i}`} src={src} />
          ))}
        </div>
        <div
          className="flex gap-3"
          style={{
            transform: `translateX(${-(offset - 200)}px)`,
            willChange: "transform",
          }}
        >
          {row2.map((src, i) => (
            <Tile key={`b${i}`} src={src} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- 3. STORY ----------------------------- */

function AnimatedChar({
  char,
  range,
  progress,
}: {
  char: string;
  range: [number, number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <motion.span style={{ opacity }}>
      {char === " " ? " " : char}
    </motion.span>
  );
}

function AnimatedText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.2"],
  });
  const total = text.length;
  const words = text.split(" ");
  let cursor = 0;
  return (
    <p
      ref={ref}
      className="max-w-[620px] text-center font-medium leading-relaxed"
      style={{ color: LIGHT, fontSize: "clamp(1rem, 2vw, 1.4rem)" }}
    >
      {words.map((word, wi) => {
        // Keep each word's characters together, but emit a real space between
        // words so the paragraph wraps normally instead of overflowing.
        const node = (
          <span key={wi} style={{ display: "inline-block" }}>
            {word.split("").map((c) => {
              const i = cursor++;
              return (
                <AnimatedChar
                  key={i}
                  char={c}
                  progress={scrollYProgress}
                  range={[i / total, (i + 1) / total]}
                />
              );
            })}
          </span>
        );
        cursor++; // account for the space that followed this word
        return (
          <Fragment key={wi}>
            {node}
            {wi < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </p>
  );
}

const PILLAR_ICONS = {
  magnify: "/img/brand/5M_Icons_SVG/with%20coloured%20background/Magnify.svg",
  mission: "/img/brand/5M_Icons_SVG/with%20coloured%20background/Mission.svg",
  membership: "/img/brand/5M_Icons_SVG/with%20coloured%20background/Membership.svg",
  maturity: "/img/brand/5M_Icons_SVG/with%20coloured%20background/Maturity.svg",
};

function StorySection() {
  return (
    <section
      id="story"
      className="relative flex min-h-screen flex-col items-center justify-center px-5 py-20 sm:px-8 md:px-10"
      style={{ background: INK }}
    >
      {/* decorative pillar icons in the corners */}
      <FadeIn
        delay={0.1}
        x={-80}
        y={0}
        duration={0.9}
        className="absolute left-[1%] top-[5%] w-[100px] sm:left-[2%] sm:w-[140px] md:left-[4%] md:w-[180px]"
      >
        <img src={PILLAR_ICONS.magnify} alt="" className="w-full" />
      </FadeIn>
      <FadeIn
        delay={0.15}
        x={80}
        y={0}
        duration={0.9}
        className="absolute right-[1%] top-[5%] w-[100px] sm:right-[2%] sm:w-[140px] md:right-[4%] md:w-[180px]"
      >
        <img src={PILLAR_ICONS.mission} alt="" className="w-full" />
      </FadeIn>
      <FadeIn
        delay={0.25}
        x={-80}
        y={0}
        duration={0.9}
        className="absolute bottom-[7%] left-[3%] w-[90px] sm:left-[6%] sm:w-[120px] md:left-[10%] md:w-[160px]"
      >
        <img src={PILLAR_ICONS.membership} alt="" className="w-full" />
      </FadeIn>
      <FadeIn
        delay={0.3}
        x={80}
        y={0}
        duration={0.9}
        className="absolute bottom-[7%] right-[3%] w-[90px] sm:right-[6%] sm:w-[120px] md:right-[10%] md:w-[160px]"
      >
        <img src={PILLAR_ICONS.maturity} alt="" className="w-full" />
      </FadeIn>

      <div className="relative z-10 flex flex-col items-center gap-10 sm:gap-14 md:gap-16">
        <FadeIn delay={0} y={40}>
          <h2
            className="text-center uppercase leading-none tracking-tight"
            style={{ ...DISPLAY, ...gradientText, fontSize: "clamp(3rem, 12vw, 170px)" }}
          >
            Our Story
          </h2>
        </FadeIn>

        <AnimatedText text="A century after seven families first gathered by gaslight above a draper's shop on Norton Road, Destiny Church is still a family — a place to belong, to find faith, hope and love, and to become who God created you to be. One hundred years on, we look ahead with the same stubborn hope toward the next." />
      </div>

      <FadeIn delay={0.1} y={30} className="relative z-10 mt-16 sm:mt-20 md:mt-24">
        <CelebrateButton />
      </FadeIn>
    </section>
  );
}

/* -------------------------- 4. MILESTONES -------------------------- */

const MILESTONES: [string, string, string][] = [
  [
    "01",
    "1926 · A Mission Is Born",
    "Reverend Albert Hollingsworth and seven families open the Norton Road Mission in a rented hall above a draper's shop — Sunday meetings by gaslight, with a single harmonium for worship.",
  ],
  [
    "02",
    "1930s · Bread for the Town",
    "Through the depths of the Depression the mission runs a soup kitchen six days a week, feeding shipyard families who had run out of everything but pride.",
  ],
  [
    "03",
    "1940s · A Shelter in the Storm",
    "Through the war years the hall doubles as an air-raid refuge. The congregation meets faithfully through blackouts, rationing and loss, refusing to let the lamp go out.",
  ],
  [
    "04",
    "1958 · A New Name",
    "After thirty-two years Hollingsworth retires; Pastor Raymond Caldwell takes the helm and the fellowship is reborn as Stockton Christian Fellowship in its first building of its own.",
  ],
  [
    "05",
    "Today · Every Nation, One Family",
    "Pastor David Okonkwo renames the church Destiny and gathers a truly multi-cultural family of faith — at home in the Destiny Centre on Norton Road, seven days a week.",
  ],
];

function MilestonesSection() {
  return (
    <section
      id="milestones"
      className="rounded-t-[40px] px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
      style={{ background: "#FFFFFF" }}
    >
      <FadeIn y={30}>
        <h2
          className="mb-16 text-center uppercase sm:mb-20 md:mb-28"
          style={{ ...DISPLAY, color: INK, fontSize: "clamp(3rem, 12vw, 170px)" }}
        >
          Milestones
        </h2>
      </FadeIn>

      <div className="mx-auto max-w-5xl">
        {MILESTONES.map(([num, name, desc], i) => (
          <FadeIn key={num} delay={i * 0.1} y={30}>
            <div
              className="flex flex-col gap-3 py-8 sm:flex-row sm:items-start sm:gap-8 sm:py-10 md:py-12"
              style={{ borderTop: "1px solid rgba(12,12,12,0.15)" }}
            >
              <span
                className="leading-none"
                style={{
                  ...DISPLAY,
                  color: INK,
                  fontSize: "clamp(3rem, 10vw, 140px)",
                }}
              >
                {num}
              </span>
              <div className="flex flex-col gap-2 sm:pt-2">
                <h3
                  className="font-medium uppercase"
                  style={{ color: INK, fontSize: "clamp(1rem, 2.2vw, 2.1rem)" }}
                >
                  {name}
                </h3>
                <p
                  className="max-w-2xl font-light leading-relaxed"
                  style={{
                    color: INK,
                    opacity: 0.6,
                    fontSize: "clamp(0.85rem, 1.6vw, 1.25rem)",
                  }}
                >
                  {desc}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- 5. CHAPTERS --------------------------- */

interface Chapter {
  num: string;
  category: string;
  name: string;
  desc: string;
  col1: [string, string];
  col2: string;
}

const G = (n: string) => `/img/photos/Gallery/${n}.webp`;

const CHAPTERS: Chapter[] = [
  {
    num: "01",
    category: "1926 – 1958 · The Pioneer",
    name: "The Hollingsworth Years",
    desc: "A pioneer with a coalfield faith. He started the mission with nothing but conviction and carried the church through the Depression and the war on little more than prayer and porridge.",
    col1: [G("OlderPeople"), G("FamilySatTogether")],
    col2: G("WorshipMoment"),
  },
  {
    num: "02",
    category: "1958 – 1990s · The Builder",
    name: "The Caldwell Years",
    desc: "The builder. He gave the church its first home of its own, raised a generation of young families, and first sent us out beyond our own walls to the wider world.",
    col1: [G("Community"), G("Speaker")],
    col2: G("SingingLand"),
  },
  {
    num: "03",
    category: "Today · The Gatherer",
    name: "The Okonkwo Years",
    desc: "The gatherer. Under his leadership the church became Destiny — a true family of every nation, language and story, where all can find a place to belong and thrive.",
    col1: [G("YouthCommunity"), G("Photography")],
    col2: G("SingingLand3"),
  },
];

function ChapterCard({
  chapter,
  index,
  total,
  progress,
}: {
  chapter: Chapter;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const targetScale = 1 - (total - 1 - index) * 0.03;
  const scale = useTransform(progress, [index / total, 1], [1, targetScale]);

  return (
    <div className="sticky top-24 flex h-[85vh] items-start justify-center md:top-32">
      <motion.div
        style={{ scale, top: `${index * 28}px` }}
        className="relative w-full max-w-6xl rounded-[40px] border-2 p-4 sm:rounded-[50px] sm:p-6 md:rounded-[60px] md:p-8"
      >
        <div
          className="absolute inset-0 rounded-[40px] border-2 sm:rounded-[50px] md:rounded-[60px]"
          style={{ borderColor: "#D7E2EA", background: INK }}
        />
        <div className="relative z-10">
          {/* Top row */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 px-2 sm:mb-6 md:mb-8">
            <div className="flex items-center gap-4 sm:gap-6">
              <span
                className="leading-none"
                style={{
                  ...DISPLAY,
                  ...gradientText,
                  fontSize: "clamp(2.5rem, 8vw, 110px)",
                }}
              >
                {chapter.num}
              </span>
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-medium uppercase tracking-[0.25em]"
                  style={{ color: ORANGE }}
                >
                  {chapter.category}
                </span>
                <span
                  className="uppercase leading-none"
                  style={{
                    ...DISPLAY,
                    color: LIGHT,
                    fontSize: "clamp(1.4rem, 3.6vw, 2.6rem)",
                  }}
                >
                  {chapter.name}
                </span>
              </div>
            </div>
            <GhostButton label="Be Part of It" />
          </div>

          {/* Description */}
          <p
            className="mb-5 max-w-3xl px-2 font-light leading-relaxed sm:mb-7 md:mb-8"
            style={{ color: MUTED, fontSize: "clamp(0.9rem, 1.5vw, 1.2rem)" }}
          >
            {chapter.desc}
          </p>

          {/* Image grid */}
          <div className="flex gap-3 sm:gap-4">
            <div className="flex w-[40%] flex-col gap-3 sm:gap-4">
              <img
                src={chapter.col1[0]}
                alt=""
                loading="lazy"
                className="w-full rounded-[30px] object-cover sm:rounded-[40px] md:rounded-[50px]"
                style={{ height: "clamp(130px, 16vw, 230px)" }}
              />
              <img
                src={chapter.col1[1]}
                alt=""
                loading="lazy"
                className="w-full rounded-[30px] object-cover sm:rounded-[40px] md:rounded-[50px]"
                style={{ height: "clamp(160px, 22vw, 340px)" }}
              />
            </div>
            <div className="w-[60%]">
              <img
                src={chapter.col2}
                alt=""
                loading="lazy"
                className="h-full w-full rounded-[30px] object-cover sm:rounded-[40px] md:rounded-[50px]"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ChaptersSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <section
      id="chapters"
      className="relative z-10 -mt-10 rounded-t-[40px] px-4 pb-24 pt-16 sm:-mt-12 sm:rounded-t-[50px] sm:px-6 md:-mt-14 md:rounded-t-[60px] md:px-10"
      style={{ background: INK }}
    >
      <FadeIn y={30} className="px-2 pb-8 pt-8 text-center sm:pb-12">
        <h2
          className="uppercase leading-none tracking-tight"
          style={{ ...DISPLAY, ...gradientText, fontSize: "clamp(3rem, 12vw, 170px)" }}
        >
          Chapters
        </h2>
      </FadeIn>

      <div ref={ref}>
        {CHAPTERS.map((chapter, i) => (
          <ChapterCard
            key={chapter.num}
            chapter={chapter}
            index={i}
            total={CHAPTERS.length}
            progress={scrollYProgress}
          />
        ))}
      </div>

      {/* Closing */}
      <FadeIn y={30} className="flex flex-col items-center gap-8 pt-24 text-center">
        <img
          src="/img/brand/destiny-logo-color-white.svg"
          alt="Destiny Church"
          className="h-10 w-auto opacity-90 md:h-12"
        />
        <p
          className="max-w-xl font-light uppercase tracking-wide"
          style={{ color: MUTED, fontSize: "clamp(0.85rem, 1.6vw, 1.15rem)" }}
        >
          1926 — 2026 · Here&apos;s to the next hundred years.
        </p>
        <CelebrateButton />
      </FadeIn>
    </section>
  );
}

/* ------------------------------ PAGE ------------------------------- */

export default function CentenaryPage() {
  return (
    <div
      style={{
        background: INK,
        color: LIGHT,
        fontFamily: "var(--font-roboto), system-ui, sans-serif",
        overflowX: "clip",
      }}
    >
      <HeroSection />
      <MarqueeSection />
      <StorySection />
      <MilestonesSection />
      <ChaptersSection />
    </div>
  );
}
