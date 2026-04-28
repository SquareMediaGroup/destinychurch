import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

type Group = {
  num: string;
  title: string;
  href: string;
  description: string;
  cutout?: string;
  cutoutAlt?: string;
  cutoutWidth: number;
  cutoutHeight: number;
  cutoutScale: number; // visual scale factor inside the frame
  cutoutOffsetX: string; // horizontal nudge
  rotation: string;
  gradient: string; // CSS gradient
  ink: string; // text color on the card
  meta: string;
};

const groups: Group[] = [
  {
    num: "01",
    title: "Kids",
    href: "/kids",
    description:
      "A fun place where children of all ages discover the Bible through games, stories, and songs.",
    cutout: "/img/TransparentBackgroundImages/Parent+Child.webp",
    cutoutAlt: "A parent holding a child",
    cutoutWidth: 5000,
    cutoutHeight: 3333,
    cutoutScale: 1.35,
    cutoutOffsetX: "-4%",
    rotation: "-2.5deg",
    gradient:
      "linear-gradient(165deg, #f5c66b 0%, #e88a3c 55%, #b8521f 100%)",
    ink: "#2a1407",
    meta: "Sundays · 11:00",
  },
  {
    num: "02",
    title: "Youth",
    href: "/youth",
    description:
      "Vibrant ministry with a mission — encounter God, build real friendships, make impact at school.",
    cutout: "/img/TransparentBackgroundImages/Youth.webp",
    cutoutAlt: "A group of young people gathered together",
    cutoutWidth: 5000,
    cutoutHeight: 3333,
    cutoutScale: 1.45,
    cutoutOffsetX: "2%",
    rotation: "1.8deg",
    gradient:
      "linear-gradient(170deg, #4ea3c4 0%, #2c5e8a 55%, #14233f 100%)",
    ink: "#f6efe1",
    meta: "Fridays · 18:30",
  },
  {
    num: "03",
    title: "Young Adults",
    href: "/young-adults",
    description:
      "A community of young adults seeking a deep, authentic relationship with Jesus together.",
    cutout: "/img/TransparentBackgroundImages/YA.webp",
    cutoutAlt: "Two young adults laughing together",
    cutoutWidth: 3338,
    cutoutHeight: 5000,
    cutoutScale: 1.55,
    cutoutOffsetX: "-2%",
    rotation: "-1.4deg",
    gradient:
      "linear-gradient(175deg, #e15a8e 0%, #a32756 50%, #4a0d28 100%)",
    ink: "#f6efe1",
    meta: "Wednesdays · 19:00",
  },
  {
    num: "04",
    title: "Connect Groups",
    href: "/connect",
    description:
      "Small groups where believers grow together — effective, powerful, fruitful witnesses in the world.",
    cutoutWidth: 1,
    cutoutHeight: 1,
    cutoutScale: 1,
    cutoutOffsetX: "0%",
    rotation: "0.6deg",
    gradient:
      "linear-gradient(160deg, #efe1c4 0%, #c8a574 55%, #6e4a23 100%)",
    ink: "#2a1407",
    meta: "Across the Tees Valley",
  },
];

export default function EveryoneHasAPlaceSection() {
  return (
    <section className="relative overflow-hidden bg-[#1a1108] py-20 sm:py-28 lg:py-36">
      {/* Subtle grain backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />
      {/* Soft warm glow at top */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[1100px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, #c1741f 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Eyebrow + headline */}
        <AnimateIn>
          <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-[#c1944a]">
            <span className="h-px w-10 bg-[#c1944a]/60" />
            <span className="font-mono">04 paths · 1 family</span>
          </div>
        </AnimateIn>

        <AnimateIn delay={80}>
          <h2
            className="mb-2 text-[42px] leading-[0.92] text-[#f6efe1] sm:text-[68px] md:text-[92px] lg:text-[112px]"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            Everyone has{" "}
            <span
              className="italic text-[#e88a3c]"
              style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 400 }}
            >
              a&nbsp;place
            </span>
          </h2>
        </AnimateIn>

        <AnimateIn delay={140}>
          <p className="mb-16 max-w-xl text-[15px] leading-relaxed text-[#f6efe1]/65 sm:mb-20 sm:text-base">
            Wherever you are in life, there&rsquo;s a room with your name on it.
            Step into the one that fits.
          </p>
        </AnimateIn>

        {/* Cards row */}
        <div className="grid gap-x-6 gap-y-24 sm:grid-cols-2 sm:gap-y-28 lg:grid-cols-4 lg:gap-x-5">
          {groups.map((g, i) => (
            <AnimateIn key={g.title} delay={180 + i * 90}>
              <GroupCard group={g} />
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function GroupCard({ group: g }: { group: Group }) {
  return (
    <Link
      href={g.href}
      className="group/card relative block pt-24 sm:pt-28 lg:pt-32"
      style={{ color: g.ink }}
    >
      {/* Cutout — sits above the frame, breaking out the top */}
      {g.cutout && (
        <div
          className="pointer-events-none absolute left-1/2 z-20 h-[260px] w-[110%] -translate-x-1/2 sm:h-[300px] lg:h-[320px]"
          style={{
            top: 0,
            transform: `translateX(calc(-50% + ${g.cutoutOffsetX})) rotate(${g.rotation})`,
            transformOrigin: "bottom center",
          }}
        >
          <div className="relative h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:-translate-y-2 group-hover/card:scale-[1.03]">
            <Image
              src={g.cutout}
              alt={g.cutoutAlt ?? g.title}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"
              priority={false}
              className="object-contain object-bottom drop-shadow-[0_30px_25px_rgba(0,0,0,0.55)]"
              style={{ transform: `scale(${g.cutoutScale})`, transformOrigin: "bottom center" }}
            />
          </div>
        </div>
      )}

      {/* Frame — the card itself */}
      <div
        className="relative isolate overflow-hidden rounded-[6px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] transition-all duration-500 ease-out group-hover/card:-translate-y-1 group-hover/card:shadow-[0_28px_60px_-15px_rgba(0,0,0,0.85)]"
        style={{
          background: g.gradient,
          minHeight: "440px",
          transform: `rotate(${g.rotation})`,
          transformOrigin: "center top",
        }}
      >
        {/* Inner mat / frame border */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-[3px] border"
          style={{ borderColor: `${g.ink}1a` }}
        />
        {/* Light glaze — top-right highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(at 80% 0%, rgba(255,255,255,0.35) 0%, transparent 55%)",
          }}
        />
        {/* Subtle bottom shade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.22), transparent)",
          }}
        />

        {/* Frame content */}
        <div className="relative z-10 flex h-full min-h-[440px] flex-col px-6 pb-6 pt-44 sm:pt-48">
          {/* Number — large editorial */}
          <div
            className="absolute right-5 top-4 text-[44px] leading-none italic opacity-80 sm:text-[52px]"
            style={{
              fontFamily: "var(--font-playfair), serif",
              color: g.ink,
            }}
          >
            {g.num}
          </div>

          {/* Title */}
          <h3
            className="text-[32px] uppercase leading-[0.95] sm:text-[36px]"
            style={{ fontFamily: "var(--font-anton), sans-serif", color: g.ink }}
          >
            {g.title}
          </h3>

          {/* Hairline */}
          <div
            className="my-3 h-px w-10"
            style={{ backgroundColor: `${g.ink}55` }}
          />

          {/* Description */}
          <p
            className="text-[13.5px] leading-relaxed sm:text-sm"
            style={{ color: `${g.ink}cc` }}
          >
            {g.description}
          </p>

          <div className="mt-auto" />

          {/* Footer row: meta + arrow */}
          <div className="mt-6 flex items-end justify-between gap-2">
            <span
              className="font-mono text-[10.5px] uppercase tracking-[0.18em]"
              style={{ color: `${g.ink}aa` }}
            >
              {g.meta}
            </span>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] transition-transform duration-300 ease-out group-hover/card:translate-x-1"
              style={{ color: g.ink }}
            >
              Enter
              <svg
                width="22"
                height="10"
                viewBox="0 0 22 10"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M0 5h20M16 1l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="square"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
