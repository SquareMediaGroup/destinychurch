// The "digital back of seats" page — what an NFC tag on the seat in front of
// you opens. Deliberately standalone: no header, no footer, no auto-opening
// site popup (suppressed in ChurchHeader / FooterGate / SitePopup / EventPopup),
// so the first thing on screen is the thing you tapped for.
//
// noindex, and absent from the sitemap: this is an in-service utility, not a
// landing page, and it would only dilute /connect-card and /give in search.

import type { Metadata } from "next";
import Link from "next/link";
import NfcTileGrid from "@/components/nfc/NfcTileGrid";
import { getNfcTiles } from "@/lib/nfcTiles";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Fill in a connect card, give, and find your next step at Destiny Church Tees Valley.",
  alternates: { canonical: "/nfc" },
  robots: { index: false, follow: false },
};

export default async function NfcPage() {
  const tiles = await getNfcTiles();

  return (
    <div className="nfc-page relative min-h-screen overflow-hidden bg-white text-destiny-grey">
      {/* page-scoped styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .nfc-page {
              background-color: #ffffff;
              background-image:
                radial-gradient(110% 60% at 100% -5%, rgba(245,128,33,0.08), transparent 60%),
                radial-gradient(90% 50% at -5% 100%, rgba(8,87,186,0.05), transparent 55%);
            }
            @keyframes nfc-rise {
              from { opacity: 0; transform: translateY(28px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes nfc-draw {
              from { transform: scaleX(0); }
              to   { transform: scaleX(1); }
            }
            .nfc-reveal {
              opacity: 0;
              animation: nfc-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .nfc-rule {
              transform-origin: left;
              animation: nfc-draw 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .nfc-card {
              min-height: 168px;
              transition: transform 0.45s cubic-bezier(0.16,1,0.3,1),
                          box-shadow 0.45s ease,
                          border-color 0.45s ease;
            }
            .nfc-card .nfc-fill {
              transform: scaleY(0);
              transform-origin: bottom;
              transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .nfc-card:hover,
            .nfc-card:focus-visible {
              transform: translateY(-6px);
              border-color: #f58021;
              box-shadow: 0 24px 50px -20px rgba(245,128,33,0.45);
            }
            .nfc-card:hover .nfc-fill,
            .nfc-card:focus-visible .nfc-fill { transform: scaleY(1); }
            .nfc-card .nfc-badge,
            .nfc-card .nfc-title,
            .nfc-card .nfc-blurb,
            .nfc-card .nfc-arrow,
            .nfc-card .nfc-icon {
              transition: color 0.4s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1);
            }
            .nfc-card:hover .nfc-badge,
            .nfc-card:focus-visible .nfc-badge { color: rgba(255,255,255,0.7); }
            .nfc-card:hover .nfc-title,
            .nfc-card:focus-visible .nfc-title,
            .nfc-card:hover .nfc-icon,
            .nfc-card:focus-visible .nfc-icon { color: #ffffff; }
            .nfc-card:hover .nfc-blurb,
            .nfc-card:focus-visible .nfc-blurb { color: rgba(255,255,255,0.85); }
            .nfc-card:hover .nfc-arrow,
            .nfc-card:focus-visible .nfc-arrow {
              color: #ffffff;
              transform: translateX(6px);
            }
            .nfc-card:hover .nfc-icon,
            .nfc-card:focus-visible .nfc-icon { transform: rotate(-4deg) scale(1.05); }
            @media (prefers-reduced-motion: reduce) {
              .nfc-reveal, .nfc-rule { animation: none; opacity: 1; transform: none; }
              .nfc-card, .nfc-card * { transition: none !important; }
            }
          `,
        }}
      />

      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-14 sm:px-8 lg:pt-20">
        {/* Masthead */}
        <header className="mb-10 lg:mb-14">
          <p
            className="nfc-reveal font-[family-name:var(--font-playfair)] text-3xl italic text-destiny-grey/80 sm:text-4xl"
            style={{ animationDelay: "0.05s" }}
          >
            Great to have you
          </p>
          <h1
            className="nfc-reveal mt-2 font-[family-name:var(--font-anton)] text-[17vw] uppercase leading-[0.92] tracking-tight text-destiny-grey sm:mt-3 sm:text-[8.5rem] lg:text-[10rem]"
            style={{ animationDelay: "0.12s" }}
          >
            Welcome
          </h1>

          <div
            className="nfc-rule mt-7 h-1 w-24 rounded-full bg-destiny-orange"
            style={{ animationDelay: "0.2s" }}
          />

          <p
            className="nfc-reveal mt-6 max-w-lg text-sm leading-relaxed text-destiny-grey/60"
            style={{ animationDelay: "0.24s" }}
          >
            Everything you need, right here — no queue, no paperwork. Tap
            anything below.
          </p>
        </header>

        <nav aria-label="Next steps">
          <NfcTileGrid tiles={tiles} />
        </nav>

        {/* No site nav on this page, so give people one way out. */}
        <footer
          className="nfc-reveal mt-14 flex flex-col items-start gap-2 border-t border-black/10 pt-8 sm:flex-row sm:items-center sm:justify-between"
          style={{ animationDelay: "0.8s" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-destiny-grey/40">
            Destiny Church Tees Valley
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-destiny-grey/60 underline-offset-4 transition-colors hover:text-destiny-orange hover:underline"
          >
            Visit the full website
            <span className="material-symbols-rounded text-base">arrow_forward</span>
          </Link>
        </footer>
      </div>
    </div>
  );
}
