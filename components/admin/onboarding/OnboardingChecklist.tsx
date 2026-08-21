"use client";

// The "Get Started" launcher and its checklist.
//
// Collapsed it's a pill in the bottom-right with the number of things left;
// open it's a list of the sections this person still owes, each one clickable
// to jump straight into that part of the tour. Finishing the last one collapses
// it for good.
//
// The rainbow border runs while there's still something to do and stops when
// there isn't — the same conic gradient the Smart Search pill uses when it's
// thinking, which is the site's existing way of saying "look here".

import { useState } from "react";
import { createPortal } from "react-dom";
import { progressFor } from "@/lib/adminOnboarding";
import { useHydrated } from "@/lib/useHydrated";
import { useOnboarding } from "@/lib/onboardingProgress";
import { useOnboardingTour } from "./OnboardingProvider";

export default function OnboardingChecklist() {
  const { sections, completed, start } = useOnboardingTour();
  const { dismiss } = useOnboarding();
  const [open, setOpen] = useState(false);
  const mounted = useHydrated();

  if (!mounted) return null;

  const { done, total, pct } = progressFor(sections, completed);
  const left = total - done;

  return createPortal(
    <div className="fixed bottom-5 right-5 z-[150] flex flex-col items-end gap-3">
      {open && (
        <div className="search-glow is-loading relative w-[min(calc(100vw-2.5rem),22rem)] rounded-3xl">
          <div className="glass admin-glass absolute inset-0 rounded-3xl" />
          <div className="relative p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-white">Let&rsquo;s start with the basics</h2>
                <p className="mt-0.5 text-xs text-white/50">
                  {left} {left === 1 ? "thing" : "things"} left
                </p>
              </div>
              <span className="text-sm font-black tabular-nums text-white/70">{pct}%</span>
            </div>

            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Onboarding progress"
            >
              <div
                className="h-full rounded-full bg-destiny-orange transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <ul className="mt-4 space-y-0.5">
              {sections.map((section) => {
                const isDone = completed.has(section.id);
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => start(section.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/10"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          isDone
                            ? "bg-destiny-orange text-white"
                            : "border border-white/25 text-transparent"
                        }`}
                      >
                        <span className="material-symbols-rounded text-sm">check</span>
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isDone ? "text-white/40 line-through" : "text-white/85"
                        }`}
                      >
                        {section.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={dismiss}
              className="mt-3 w-full rounded-xl border-t border-white/10 pt-3 text-center text-xs font-bold text-white/45 transition hover:text-white"
            >
              Dismiss checklist
            </button>
          </div>
        </div>
      )}

      <div className="search-glow is-loading relative rounded-full">
        <div className="glass admin-glass glass-pill absolute inset-0 rounded-full" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="relative flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
        >
          <span className="material-symbols-rounded text-lg text-destiny-orange">
            {open ? "expand_more" : "rocket_launch"}
          </span>
          Get Started
          {left > 0 && (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destiny-orange px-1.5 text-[11px] font-black tabular-nums text-white">
              {left}
            </span>
          )}
        </button>
      </div>
    </div>,
    document.body,
  );
}
