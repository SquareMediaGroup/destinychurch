"use client";

// The "Get Started" launcher and its checklist.
//
// Collapsed it's a pill in the bottom-right with the number of things left;
// open it's a list of the sections this person still owes, each one clickable
// to jump straight into that part of the tour. Finishing the last one collapses
// it for good.
//
// The rainbow border runs while there's still something to do and stops when
// there isn't — the same BorderBeam the Smart Search pill uses when it's
// loading, which is the site's existing way of saying "look here".

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BorderBeam } from "border-beam";
import { progressFor } from "@/lib/adminOnboarding";
import { useHydrated } from "@/lib/useHydrated";
import { useOnboarding } from "@/lib/onboardingProgress";
import { useOnboardingTour } from "./OnboardingProvider";

export default function OnboardingChecklist() {
  const { sections, completed, start } = useOnboardingTour();
  const { dismiss } = useOnboarding();
  const [open, setOpen] = useState(false);
  const mounted = useHydrated();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted) return null;

  const { done, total, pct } = progressFor(sections, completed);
  const left = total - done;

  return createPortal(
    <div className="fixed bottom-5 right-5 z-[150] flex flex-col items-end gap-3">
      {open && (
        <BorderBeam size="pulse-inner" borderRadius={24} strength={1} className="relative w-[min(calc(100vw-2.5rem),22rem)] rounded-3xl">
          <div className="glass admin-glass absolute inset-0 rounded-3xl" />
          <div className="relative p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="onboarding-checklist-title" className="text-sm font-black text-white">
                  Get started
                </h2>
                <p className="mt-0.5 text-xs text-white/55">
                  {done} of {total} done. Pick any one to jump straight in.
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
                      onClick={() => {
                        // Closed first, so it doesn't spring back open over the
                        // page when the tour ends.
                        setOpen(false);
                        start(section.id);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/10"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          isDone
                            ? "bg-destiny-orange text-white"
                            : "border border-white/25 text-transparent"
                        }`}
                      >
                        <span className="material-symbols-rounded text-sm" aria-hidden="true">check</span>
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isDone ? "text-white/45 line-through" : "text-white/85"
                        }`}
                      >
                        {section.label}
                        {isDone && <span className="sr-only"> (done)</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 border-t border-white/10 pt-3 text-center">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-2 py-1 text-xs font-bold text-white/55 transition hover:text-white"
              >
                Hide checklist
              </button>
              <p className="mt-1 text-[11px] text-white/40">
                Bring it back any time: press Command-K and search for &ldquo;tour&rdquo;.
              </p>
            </div>
          </div>
        </BorderBeam>
      )}

      <BorderBeam size="pulse-inner" borderRadius={9999} strength={1} active={left > 0} className="relative rounded-full">
        <div className="glass admin-glass glass-pill absolute inset-0 rounded-full" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={left > 0 ? `Get Started, ${left} left` : "Get Started"}
          className="relative flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
        >
          <span className="material-symbols-rounded text-lg text-destiny-orange" aria-hidden="true">
            {open ? "expand_more" : "rocket_launch"}
          </span>
          Get Started
          {left > 0 && (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destiny-orange px-1.5 text-[11px] font-black tabular-nums text-white">
              {left}
            </span>
          )}
        </button>
      </BorderBeam>
    </div>,
    document.body,
  );
}
