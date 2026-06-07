import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Next Steps",
  description:
    "Your next step at Destiny Church Tees Valley — get baptised, join a team or connect group, dedicate your child, explore a course, or give.",
  alternates: { canonical: "/links" },
  openGraph: {
    title: "Next Steps | Destiny Church Tees Valley",
    description:
      "Six ways to go further with us — pick where you're headed.",
    url: "https://destinytees.uk/links",
  },
};

type Step = {
  index: string;
  title: string;
  blurb: string;
  href: string;
  icon: string;
};

const steps: Step[] = [
  {
    index: "01",
    title: "Baptism",
    blurb: "Go public with your faith.",
    href: "/baptism",
    icon: "water_drop",
  },
  {
    index: "02",
    title: "Joining a Team",
    blurb: "Use your gifts and serve.",
    href: "/serve",
    icon: "diversity_3",
  },
  {
    index: "03",
    title: "Joining a Connect Group",
    blurb: "Find your people midweek.",
    href: "/connect",
    icon: "groups",
  },
  {
    index: "04",
    title: "Dedicating your Child",
    blurb: "Celebrate and bless the little ones.",
    href: "/child-dedication",
    icon: "child_care",
  },
  {
    index: "05",
    title: "Courses",
    blurb: "Explore life, faith and meaning.",
    href: "/alpha",
    icon: "menu_book",
  },
  {
    index: "06",
    title: "Giving",
    blurb: "Partner with the vision.",
    href: "/give",
    icon: "volunteer_activism",
  },
];

export default function LinksPage() {
  return (
    <div className="links-page relative min-h-screen overflow-hidden bg-[#1c0f06] text-[#f5ece2]">
      {/* page-scoped styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .links-page {
              background-color: #1c0f06;
              background-image:
                radial-gradient(120% 80% at 85% -10%, rgba(245,128,33,0.22), transparent 60%),
                radial-gradient(90% 70% at 0% 100%, rgba(245,128,33,0.10), transparent 55%),
                linear-gradient(180deg, #2c1a0e 0%, #1c0f06 55%, #160b04 100%);
            }
            .links-grain::before {
              content: "";
              position: absolute;
              inset: 0;
              pointer-events: none;
              opacity: 0.5;
              mix-blend-mode: overlay;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
            }
            @keyframes links-rise {
              from { opacity: 0; transform: translateY(28px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes links-draw {
              from { transform: scaleX(0); }
              to   { transform: scaleX(1); }
            }
            .links-reveal {
              opacity: 0;
              animation: links-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .links-rule {
              transform-origin: left;
              animation: links-draw 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .step-row .step-fill {
              transform: scaleX(0);
              transform-origin: left;
              transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .step-row:hover .step-fill,
            .step-row:focus-visible .step-fill {
              transform: scaleX(1);
            }
            .step-row .step-content { transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
            .step-row:hover .step-content,
            .step-row:focus-visible .step-content { transform: translateX(20px); }
            .step-row .step-num,
            .step-row .step-title,
            .step-row .step-blurb,
            .step-row .step-arrow,
            .step-row .step-icon { transition: color 0.45s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.45s ease; }
            .step-row:hover .step-num,
            .step-row:focus-visible .step-num,
            .step-row:hover .step-title,
            .step-row:focus-visible .step-title,
            .step-row:hover .step-blurb,
            .step-row:focus-visible .step-blurb,
            .step-row:hover .step-icon,
            .step-row:focus-visible .step-icon { color: #1c0f06; }
            .step-row:hover .step-arrow,
            .step-row:focus-visible .step-arrow { color: #1c0f06; transform: translateX(8px); }
            .step-row:hover .step-icon,
            .step-row:focus-visible .step-icon { opacity: 1; transform: rotate(-4deg) scale(1.05); }
            @media (prefers-reduced-motion: reduce) {
              .links-reveal, .links-rule { animation: none; opacity: 1; transform: none; }
              .step-row * { transition: none !important; }
            }
          `,
        }}
      />
      <div className="links-grain absolute inset-0" />

      <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-16 sm:px-8 lg:pt-24">
        {/* Masthead */}
        <header className="mb-14 lg:mb-20">
          <div
            className="links-reveal flex items-center gap-3 text-[0.7rem] font-bold uppercase tracking-[0.32em] text-destiny-orange"
            style={{ animationDelay: "0.05s" }}
          >
            <span className="material-symbols-rounded text-base">north_east</span>
            Destiny Church · Tees Valley
          </div>

          <h1 className="mt-6 leading-[0.92]">
            <span
              className="links-reveal block font-[family-name:var(--font-playfair)] text-4xl italic text-[#f5ece2]/90 sm:text-5xl"
              style={{ animationDelay: "0.12s" }}
            >
              Take your
            </span>
            <span
              className="links-reveal block font-[family-name:var(--font-anton)] text-[19vw] uppercase tracking-tight text-white sm:text-[10rem] lg:text-[12rem]"
              style={{ animationDelay: "0.18s" }}
            >
              Next Step
            </span>
          </h1>

          <p
            className="links-reveal mt-6 max-w-md text-base leading-relaxed text-[#f5ece2]/65"
            style={{ animationDelay: "0.26s" }}
          >
            Six ways to go further with us. Whatever&apos;s next for you, start here
            — pick where you&apos;re headed and we&apos;ll meet you there.
          </p>

          <div
            className="links-rule mt-10 h-px w-full bg-[#f5ece2]/15"
            style={{ animationDelay: "0.3s" }}
          />
        </header>

        {/* The index */}
        <nav aria-label="Next steps">
          <ul>
            {steps.map((step, i) => (
              <li
                key={step.href}
                className="links-reveal"
                style={{ animationDelay: `${0.36 + i * 0.07}s` }}
              >
                <Link
                  href={step.href}
                  className="step-row group relative block overflow-hidden border-b border-[#f5ece2]/12 outline-none"
                >
                  {/* orange wipe */}
                  <span
                    aria-hidden
                    className="step-fill absolute inset-0 bg-destiny-orange"
                  />

                  <div className="step-content relative flex items-center gap-4 px-1 py-6 sm:gap-7 sm:py-8">
                    <span className="step-num w-10 shrink-0 font-[family-name:var(--font-anton)] text-lg text-destiny-orange sm:w-14 sm:text-2xl">
                      {step.index}
                    </span>

                    <span
                      aria-hidden
                      className="material-symbols-rounded step-icon shrink-0 text-2xl text-[#f5ece2]/40 sm:text-3xl"
                    >
                      {step.icon}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="step-title block font-[family-name:var(--font-heading)] text-xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                        {step.title}
                      </span>
                      <span className="step-blurb mt-0.5 block text-sm text-[#f5ece2]/55 sm:text-base">
                        {step.blurb}
                      </span>
                    </span>

                    <span className="material-symbols-rounded step-arrow shrink-0 text-3xl text-[#f5ece2]/70 sm:text-4xl">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer note */}
        <p
          className="links-reveal mt-14 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#f5ece2]/45"
          style={{ animationDelay: "0.9s" }}
        >
          Not sure where to begin?
          <Link
            href="/new-here"
            className="font-semibold text-destiny-orange underline-offset-4 hover:underline"
          >
            Start with New Here
          </Link>
          <span className="text-[#f5ece2]/25">— or</span>
          <Link
            href="/contact"
            className="font-semibold text-destiny-orange underline-offset-4 hover:underline"
          >
            get in touch
          </Link>
        </p>
      </div>
    </div>
  );
}
