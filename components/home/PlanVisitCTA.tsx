"use client";

import { lazy, Suspense } from "react";
import Link from "next/link";

// Same lazy-loaded rotating glow as the Smart Search pill
// (components/smartSearch/SmartSearchWidget.tsx) — code-split so the effect's
// weight never blocks first paint, and the pill underneath is fully
// interactive before it arrives.
const BorderBeam = lazy(() =>
  import("border-beam").then((mod) => ({ default: mod.BorderBeam }))
);

const pillClassName =
  "glass glass-refract glass-pill relative flex h-14 items-center justify-center px-8 text-base font-bold text-white transition hover:brightness-110";

const pill = (
  <Link href="/visit" className={pillClassName}>
    Plan your visit
  </Link>
);

/**
 * The site's one CTA-styled control — everywhere else (including "Get
 * directions" right next to this) is a plain text link, so this pill is the
 * only thing on the page asking for a click. It borrows its glow and glass
 * treatment straight from Smart Search rather than inventing a second visual
 * language for "important button."
 */
export default function PlanVisitCTA() {
  return (
    <Suspense fallback={pill}>
      <BorderBeam
        size="pulse-outside"
        borderRadius={9999}
        active
        strength={0.8}
        className="rounded-full"
      >
        {pill}
      </BorderBeam>
    </Suspense>
  );
}
