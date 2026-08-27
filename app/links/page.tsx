import type { Metadata } from "next";
import Link from "next/link";
import LinksStepGrid from "@/components/links/LinksStepGrid";
import { LINKS_STEPS } from "@/lib/linksSteps";

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

export default function LinksPage() {
  return (
    <div className="links-page relative min-h-screen overflow-hidden bg-white text-destiny-grey">
      {/* page-scoped styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .links-page {
              background-color: #ffffff;
              background-image:
                radial-gradient(110% 60% at 100% -5%, rgba(245,128,33,0.08), transparent 60%),
                radial-gradient(90% 50% at -5% 100%, rgba(8,87,186,0.05), transparent 55%);
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
            .step-card {
              transition: transform 0.45s cubic-bezier(0.16,1,0.3,1),
                          box-shadow 0.45s ease,
                          border-color 0.45s ease;
            }
            .step-card .step-fill {
              transform: scaleY(0);
              transform-origin: bottom;
              transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .step-card:hover,
            .step-card:focus-visible {
              transform: translateY(-6px);
              border-color: #f58021;
              box-shadow: 0 24px 50px -20px rgba(245,128,33,0.45);
            }
            .step-card:hover .step-fill,
            .step-card:focus-visible .step-fill { transform: scaleY(1); }
            .step-card .step-num,
            .step-card .step-title,
            .step-card .step-blurb,
            .step-card .step-arrow,
            .step-card .step-icon {
              transition: color 0.4s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1);
            }
            .step-card:hover .step-num,
            .step-card:focus-visible .step-num { color: rgba(255,255,255,0.85); }
            .step-card:hover .step-title,
            .step-card:focus-visible .step-title,
            .step-card:hover .step-icon,
            .step-card:focus-visible .step-icon { color: #ffffff; }
            .step-card:hover .step-blurb,
            .step-card:focus-visible .step-blurb { color: rgba(255,255,255,0.85); }
            .step-card:hover .step-arrow,
            .step-card:focus-visible .step-arrow {
              color: #ffffff;
              transform: translateX(6px);
            }
            .step-card:hover .step-icon,
            .step-card:focus-visible .step-icon { transform: rotate(-4deg) scale(1.05); }
            @media (prefers-reduced-motion: reduce) {
              .links-reveal, .links-rule { animation: none; opacity: 1; transform: none; }
              .step-card, .step-card * { transition: none !important; }
            }
          `,
        }}
      />

      <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-16 sm:px-8 lg:pt-24">
        {/* Masthead */}
        <header className="mb-12 lg:mb-16">
          <h1 className="leading-[0.92]">
            <span
              className="links-reveal block font-[family-name:var(--font-playfair)] text-4xl italic text-destiny-grey/80 sm:text-5xl"
              style={{ animationDelay: "0.05s" }}
            >
              Take your
            </span>
            <span
              className="links-reveal mt-2 block font-[family-name:var(--font-anton)] text-[18vw] uppercase tracking-tight text-destiny-grey sm:mt-3 sm:text-[9.5rem] lg:text-[11.5rem]"
              style={{ animationDelay: "0.12s" }}
            >
              Next Steps
            </span>
          </h1>

          <div
            className="links-rule mt-8 h-1 w-24 rounded-full bg-destiny-orange"
            style={{ animationDelay: "0.2s" }}
          />
        </header>

        {/* The grid — 2 across, 3 down */}
        <LinksStepGrid steps={LINKS_STEPS} />

        {/* CTA */}
        <div
          className="links-reveal mt-12 overflow-hidden rounded-3xl bg-destiny-grey px-7 py-10 sm:mt-16 sm:px-12 sm:py-12"
          style={{ animationDelay: "0.75s" }}
        >
          <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-destiny-orange">
                New to all this?
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-black text-white sm:text-3xl">
                Not sure where to begin?
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/60">
                Start with the basics and we&apos;ll help you find your place — no
                pressure, no experience needed.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <Link
                href="/new-here"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.03] hover:bg-destiny-orange-dark"
              >
                Start with New Here
                <span className="material-symbols-rounded text-lg">arrow_forward</span>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Or get in touch
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
