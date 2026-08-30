"use client";

// The overlay: dims the page, lights up one element, and explains it.
//
// The dimming is four rectangles around the target rather than a clip-path or
// an inset box-shadow. Both of those are fewer nodes, and both swallow clicks
// over the hole — which would break every sandbox step, since the whole point
// is that you press the real button yourself.
//
// The card borrows the Smart Search rainbow while the tour is moving between
// pages. That BorderBeam is the one piece of motion this site already uses to
// mean "working, hold on", so reusing it here costs nothing to learn.

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BorderBeam } from "border-beam";
import type { TourStep } from "@/lib/adminOnboarding";
import { useHydrated } from "@/lib/useHydrated";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_W = 380;
const GAP = 16;

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

/**
 * Where the card goes. Preference first, then whichever side actually has room —
 * a card that hangs off the bottom of a laptop screen is worse than one on the
 * wrong side of the button.
 */
function placeCard(
  rect: Rect | null,
  preferred: TourStep["placement"],
  viewport: { w: number; h: number },
): { top: number; left: number; centred: boolean } {
  const cardH = 240;
  if (!rect || viewport.w < 720) {
    // No anchor, or a phone-width admin — the card goes to the bottom, full
    // width, where it can't cover the thing it's describing.
    return { top: viewport.h - cardH - GAP, left: GAP, centred: true };
  }

  const room = {
    bottom: viewport.h - (rect.top + rect.height),
    top: rect.top,
    right: viewport.w - (rect.left + rect.width),
    left: rect.left,
  };

  const order: NonNullable<TourStep["placement"]>[] =
    preferred && preferred !== "auto"
      ? [preferred, "bottom", "right", "top", "left"]
      : ["bottom", "right", "top", "left"];

  const side =
    order.find((s) => {
      if (s === "bottom" || s === "top") return room[s] > cardH + GAP;
      return room[s as "left" | "right"] > CARD_W + GAP;
    }) ?? "bottom";

  const clampX = (x: number) => Math.max(GAP, Math.min(x, viewport.w - CARD_W - GAP));
  const clampY = (y: number) => Math.max(GAP, Math.min(y, viewport.h - cardH - GAP));

  switch (side) {
    case "top":
      return { top: clampY(rect.top - cardH - GAP), left: clampX(rect.left), centred: false };
    case "left":
      return { top: clampY(rect.top), left: clampX(rect.left - CARD_W - GAP), centred: false };
    case "right":
      return {
        top: clampY(rect.top),
        left: clampX(rect.left + rect.width + GAP),
        centred: false,
      };
    default:
      return {
        top: clampY(rect.top + rect.height + GAP),
        left: clampX(rect.left),
        centred: false,
      };
  }
}

export default function TourSpotlight({
  step,
  anchor,
  searching,
  index,
  total,
  onNext,
  onBack,
  onExit,
}: {
  step: TourStep;
  anchor: HTMLElement | null;
  searching: boolean;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });
  const mounted = useHydrated();

  // The anchor moves whenever the page scrolls, a list finishes loading or the
  // window resizes, so the frame is recomputed on a rAF loop rather than once.
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setRect(anchor ? rectOf(anchor) : null);
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onExit]);

  if (!mounted) return null;

  const card = placeCard(rect, step.placement, viewport);
  const waiting = step.advanceOnClick;

  return createPortal(
    <>
      {/* Four panels leaving a real, clickable hole over the anchor. */}
      {rect ? (
        <>
          <div className="tour-scrim" style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} />
          <div
            className="tour-scrim"
            style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className="tour-scrim"
            style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }}
          />
          <div
            className="tour-scrim"
            style={{
              top: rect.top,
              left: rect.left + rect.width,
              right: 0,
              height: rect.height,
            }}
          />
          <div
            className="tour-ring"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        </>
      ) : (
        <div className="tour-scrim" style={{ inset: 0 }} />
      )}

      <div
        className="tour-card tour-card-enter"
        style={{
          top: card.top,
          left: card.centred ? undefined : card.left,
          right: card.centred ? 16 : undefined,
          width: card.centred ? undefined : CARD_W,
        }}
        role="dialog"
        aria-modal="false"
        aria-label={step.title}
      >
        {/* BorderBeam owns the loading glow on the wrapper it renders, so the
            glass has to be an inner layer — the same structure as the Smart
            Search pill. */}
        <BorderBeam size="md" borderRadius={24} active={searching} strength={1} className="relative rounded-3xl">
          <div className="glass admin-glass absolute inset-0 rounded-3xl" />
          <div className="relative p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/45">
                Step {index + 1} of {total}
              </span>
              <button
                type="button"
                onClick={onExit}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Exit the tour"
              >
                <span className="material-symbols-rounded text-lg">close</span>
              </button>
            </div>

            <h2 className="text-base font-black leading-tight text-white">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{step.body}</p>

            {step.sandbox && (
              <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-white/8 px-3 py-2 text-xs font-bold text-white/60">
                <span className="material-symbols-rounded text-sm leading-none">shield</span>
                Practice only — nothing on this page will be saved.
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onBack}
                disabled={index === 0}
                className="rounded-xl px-3 py-2 text-xs font-bold text-white/55 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                Back
              </button>

              {waiting ? (
                <span className="text-xs font-bold text-white/45">
                  Press it when you&rsquo;re ready
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
                >
                  {index + 1 === total ? "Finish" : "Next"}
                  <span className="material-symbols-rounded text-base">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </BorderBeam>
      </div>
    </>,
    document.body,
  );
}
