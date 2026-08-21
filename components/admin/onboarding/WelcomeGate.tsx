"use client";

// The one-time welcome. Shown on a person's first visit to /admin and never
// again, whichever button they press.
//
// It is a gate, not a wall: "Skip for now" is a real answer and is recorded as
// one. Forcing somebody through a tour before they can reach a page they've
// been sent to fix is how onboarding earns a reputation for being in the way.
//
// It names the access levels they hold, because most people arrive not knowing
// what they've been given — that single line answers the question they were
// about to ask someone.

import { createPortal } from "react-dom";
import { useEffect } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { minutesFor, type TourSection } from "@/lib/adminOnboarding";
import { TOURS, TOUR_ORDER } from "@/lib/adminOnboarding";
import type { RoleFlags } from "@/lib/adminRoles";

export default function WelcomeGate({
  sections,
  roles,
  onStart,
  onSkip,
}: {
  sections: TourSection[];
  roles: RoleFlags;
  onStart: () => void;
  onSkip: () => void;
}) {
  const mounted = useHydrated();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!mounted) return null;

  const held = TOUR_ORDER.filter((role) => roles[role]).map((role) => TOURS[role]);
  const minutes = minutesFor(sections);

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="search-glow is-loading relative w-full max-w-lg rounded-3xl">
        <div className="glass admin-glass absolute inset-0 rounded-3xl" />
        <div className="relative p-8">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/45">
            Welcome
          </span>
          <h1 className="mt-2 text-2xl font-black leading-tight text-white">
            Let&rsquo;s show you around
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            This admin only shows you the parts of the website you look after. A short
            walkthrough covers each one — and nothing you do inside it is saved, so you
            can press every button.
          </p>

          <ul className="mt-6 space-y-2">
            {held.map((tour) => (
              <li
                key={tour.role}
                className="flex items-start gap-3 rounded-2xl bg-white/8 px-4 py-3"
              >
                <span className="material-symbols-rounded mt-0.5 text-lg text-destiny-orange">
                  {tour.icon}
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">{tour.label}</span>
                  <span className="block text-xs text-white/55">{tour.blurb}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-white/40">
            About {minutes} {minutes === 1 ? "minute" : "minutes"} · {sections.length} steps
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Show me around
              <span className="material-symbols-rounded text-lg">arrow_forward</span>
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-xl px-4 py-3 text-sm font-bold text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
