"use client";

// The six-card grid on /links. Moved out of app/links/page.tsx (which stays a
// Server Component for its metadata and static shell) only because a click
// handler needs "use client" — the markup, classes and animation delays are
// otherwise unchanged from what the page rendered before.

import Link from "next/link";
import type { Step } from "@/lib/linksSteps";
import { trackClick } from "@/lib/track";

export default function LinksStepGrid({ steps }: { steps: Step[] }) {
  return (
    <nav aria-label="Next steps">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {steps.map((step, i) => (
          <li
            key={step.href}
            className="links-reveal"
            style={{ animationDelay: `${0.26 + i * 0.07}s` }}
          >
            <Link
              href={step.href}
              onClick={() => trackClick("links", step.href, step.title)}
              className="step-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-6 outline-none sm:p-7"
            >
              {/* orange fill on hover */}
              <span aria-hidden className="step-fill absolute inset-0 bg-destiny-orange" />

              <div className="relative flex items-start justify-between">
                <span className="step-num font-[family-name:var(--font-anton)] text-2xl text-destiny-orange">
                  {step.index}
                </span>
                <span
                  aria-hidden
                  className="material-symbols-rounded step-icon text-3xl text-destiny-grey/30"
                >
                  {step.icon}
                </span>
              </div>

              <div className="relative mt-10 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="step-title font-[family-name:var(--font-heading)] text-xl font-black leading-tight text-destiny-grey sm:text-2xl">
                    {step.title}
                  </h2>
                  <p className="step-blurb mt-1 text-sm text-destiny-grey/55">
                    {step.blurb}
                  </p>
                </div>
                <span className="material-symbols-rounded step-arrow shrink-0 text-3xl text-destiny-grey/40">
                  arrow_forward
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
