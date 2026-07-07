import type { Metadata } from "next";
import DestinyAiChat from "@/components/destinyAi/DestinyAiChat";

// Reached only via the CTA on /help — not linked from navigation or the
// sitemap, and kept out of search results since it isn't a browsable page.
export const metadata: Metadata = {
  title: "Destiny AI",
  description: "Ask Destiny AI about visiting, service times, directions, or the weather for Sunday.",
  robots: { index: false, follow: false },
};

export default function DestinyAiPage() {
  return (
    <div className="destiny-ai-page relative min-h-screen overflow-hidden bg-white text-destiny-grey">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .destiny-ai-page {
              background-color: #ffffff;
              background-image:
                radial-gradient(110% 60% at 100% -5%, rgba(245,128,33,0.08), transparent 60%),
                radial-gradient(90% 50% at -5% 100%, rgba(8,87,186,0.05), transparent 55%);
            }
            @keyframes dai-rise {
              from { opacity: 0; transform: translateY(24px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .dai-reveal {
              opacity: 0;
              animation: dai-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @media (prefers-reduced-motion: reduce) {
              .dai-reveal { animation: none; opacity: 1; transform: none; }
            }
          `,
        }}
      />

      <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-16 sm:px-8 lg:pt-20">
        <header className="mb-10 dai-reveal">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-destiny-orange">Ask Anything About Destiny</p>
          <h1 className="mt-2 leading-[0.95]">
            <span className="block font-[family-name:var(--font-playfair)] text-3xl italic text-destiny-grey/70 sm:text-4xl">
              Meet
            </span>
            <span className="block font-[family-name:var(--font-anton)] text-6xl uppercase tracking-tight text-destiny-grey sm:text-7xl">
              Destiny AI
            </span>
          </h1>
        </header>

        <div className="dai-reveal" style={{ animationDelay: "0.1s" }}>
          <DestinyAiChat />
        </div>
      </div>
    </div>
  );
}
