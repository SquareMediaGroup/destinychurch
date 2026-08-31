"use client";

// Shared conversation renderer for Smart Search — used by both the floating
// pill (components/FloatingSmartSearch.tsx) and the plain embedded box on the
// 404 page (components/NotFoundSearch.tsx). Same messages, cards, options and
// CTA rendering either way; only the surrounding chrome differs per surface.

import { lazy, Suspense } from "react";
import Link from "next/link";
import {
  ProductResultCards,
  WeatherResultCard,
  DirectionsResultCard,
  WebResultsCard,
} from "@/components/smartSearch/ResultCards";
import type { ChatMessage } from "@/lib/useSmartSearchChat";

const ThinkingOrb = lazy(() =>
  import("thinking-orbs").then((mod) => ({ default: mod.ThinkingOrb })),
);

function OrbFallback() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-destiny-orange" />
  );
}

export function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

export function SmartSearchThread({
  messages,
  loading,
  toolStatus,
  onOptionClick,
  onCtaClick,
  bottomRef,
}: {
  messages: ChatMessage[];
  loading: boolean;
  toolStatus: string | null;
  onOptionClick: (option: string) => void;
  onCtaClick?: () => void;
  bottomRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="space-y-3">
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "assistant" && (
            <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/15">
              <SparkleIcon className="h-3 w-3 text-destiny-orange" />
            </div>
          )}
          <div className="max-w-[85%] min-w-0">
            {msg.content && (
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-destiny-orange text-white"
                    : "rounded-tl-sm bg-white/10 text-white/85"
                }`}
              >
                {msg.content}
              </div>
            )}

            {msg.role === "assistant" && (
              <>
                {msg.products && msg.products.length > 0 && <ProductResultCards products={msg.products} />}
                {msg.weather && <WeatherResultCard data={msg.weather} />}
                {msg.directions && <DirectionsResultCard data={msg.directions} />}
                {msg.web && <WebResultsCard data={msg.web} />}
              </>
            )}

            {msg.role === "assistant" && i === messages.length - 1 && (
              <>
                {msg.options && msg.options.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => onOptionClick(option)}
                        disabled={loading}
                        className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 transition hover:border-destiny-orange hover:bg-destiny-orange/15 hover:text-white disabled:opacity-40"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {!msg.options?.length && msg.page && msg.ctaLabel && (
                  <Link
                    href={msg.page}
                    onClick={onCtaClick}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-destiny-orange px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                  >
                    {msg.ctaLabel}
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {(loading || toolStatus) && (
        <div className="flex justify-start">
          <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/15">
            <SparkleIcon className="h-3 w-3 text-destiny-orange" />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3">
            {toolStatus ? (
              <span className="text-xs text-white/60">{toolStatus}</span>
            ) : (
              <Suspense fallback={<OrbFallback />}>
                <ThinkingOrb state="searching" size={20} />
              </Suspense>
            )}
          </div>
        </div>
      )}
      {bottomRef && <div ref={bottomRef} />}
    </div>
  );
}
