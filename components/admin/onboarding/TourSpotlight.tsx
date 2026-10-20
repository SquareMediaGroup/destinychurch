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

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BorderBeam } from "border-beam";
import type { TourSection, TourStep } from "@/lib/adminOnboarding";
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
/** Below this the card stops floating beside its target and docks to the bottom. */
const PHONE_W = 720;

type CardPosition =
  /** Beside the anchor, or the middle of the screen when there isn't one. */
  | { kind: "beside"; top: number; left: number }
  /** Phone width: full width along an edge, clear of what it describes. */
  | { kind: "dock"; edge: "top" | "bottom" };

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
  cardH: number,
): CardPosition {
  // Phone-width admin: dock to the bottom, full width. Measured against the
  // card's real height rather than a guess, so a long step can't hang off the
  // bottom of the screen and a short one doesn't float halfway up it.
  // The tab bar lives along the bottom on phones, so a step pointing at
  // something down there docks to the top instead.
  if (viewport.w < PHONE_W) {
    const coversAnchor = rect !== null && rect.top + rect.height > viewport.h - cardH - GAP * 2;
    return { kind: "dock", edge: coversAnchor ? "top" : "bottom" };
  }
  // No anchor on a wide screen: the middle of the viewport. Computed rather
  // than done with a translate, because the entrance animation owns transform.
  if (!rect) {
    return {
      kind: "beside",
      top: Math.max(GAP, (viewport.h - cardH) / 2),
      left: Math.max(GAP, (viewport.w - CARD_W) / 2),
    };
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
      return { kind: "beside", top: clampY(rect.top - cardH - GAP), left: clampX(rect.left) };
    case "left":
      return { kind: "beside", top: clampY(rect.top), left: clampX(rect.left - CARD_W - GAP) };
    case "right":
      return { kind: "beside", top: clampY(rect.top), left: clampX(rect.left + rect.width + GAP) };
    default:
      return { kind: "beside", top: clampY(rect.top + rect.height + GAP), left: clampX(rect.left) };
  }
}

function cardStyle(pos: CardPosition): React.CSSProperties {
  switch (pos.kind) {
    case "beside":
      return { top: pos.top, left: pos.left, width: CARD_W };
    case "dock":
      return { [pos.edge]: GAP, left: GAP, right: GAP };
  }
}

/** Typing into a sandbox form must not page the tour on. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
  );
}

export default function TourSpotlight({
  step,
  section,
  anchor,
  searching,
  index,
  total,
  onNext,
  onBack,
  onExit,
}: {
  step: TourStep;
  /** The checklist section this step belongs to; null for the closing card. */
  section: TourSection | null;
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
  const [cardH, setCardH] = useState(240);
  const cardRef = useRef<HTMLDivElement>(null);
  const mounted = useHydrated();

  // The anchor moves whenever the page scrolls, a list finishes loading or the
  // window resizes, so the frame is recomputed on a rAF loop rather than once.
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setRect(anchor ? rectOf(anchor) : null);
      if (cardRef.current) setCardH(cardRef.current.offsetHeight);
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [anchor]);

  // A step that waits for a click on its anchor has no Next button — unless
  // the anchor never turned up, in which case there is nothing to click and
  // the tour would be stuck. Offer Next then.
  const waiting = Boolean(step.advanceOnClick) && (anchor !== null || searching);
  const last = index + 1 === total;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" && !waiting) onNext();
      if (e.key === "ArrowLeft" && index > 0) onBack();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onExit, onNext, onBack, waiting, index]);

  if (!mounted) return null;

  const card = placeCard(rect, step.placement, viewport, cardH);
  const position = section
    ? section.steps.findIndex((s) => s.id === step.id) + 1
    : 0;
  const pct = Math.round(((index + 1) / total) * 100);

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
        ref={cardRef}
        key={step.id}
        className="tour-card tour-card-enter max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl"
        style={cardStyle(card)}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-body"
      >
        {/* BorderBeam owns the loading glow on the wrapper it renders, so the
            glass has to be an inner layer — the same structure as the Smart
            Search pill. */}
        <BorderBeam size="pulse-inner" borderRadius={24} active={searching} strength={1} className="relative rounded-3xl">
          <div className="glass admin-glass absolute inset-0 rounded-3xl" />
          <div className="relative p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-widest text-white/45">
                {section ? (
                  <>
                    {section.label}
                    {section.steps.length > 1 && (
                      <span className="tabular-nums"> · {position} of {section.steps.length}</span>
                    )}
                  </>
                ) : last ? (
                  "All done"
                ) : (
                  <span className="tabular-nums">Step {index + 1} of {total}</span>
                )}
              </span>
              <button
                type="button"
                onClick={onExit}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Exit the tour"
              >
                <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
              </button>
            </div>

            <h2 id="tour-step-title" className="text-base font-black leading-tight text-white">
              {step.title}
            </h2>
            <p id="tour-step-body" className="mt-2 text-sm leading-relaxed text-white/70">
              {step.body}
            </p>

            {step.sandbox && (
              <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-white/8 px-3 py-2 text-xs font-bold text-white/60">
                <span className="material-symbols-rounded text-sm leading-none" aria-hidden="true">shield</span>
                Practice only. Nothing on this page will be saved.
              </p>
            )}

            {/* Whole-run progress, so a section label never hides how far is left. */}
            <div
              className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-valuenow={index + 1}
              aria-valuemin={1}
              aria-valuemax={total}
              aria-label={`Step ${index + 1} of ${total}`}
            >
              <div
                className="h-full rounded-full bg-destiny-orange transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

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
                <span className="text-right text-xs font-bold text-white/55">
                  Press the highlighted button to continue
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
                >
                  {last ? "Finish" : "Next"}
                  {!last && (
                    <span className="material-symbols-rounded text-base" aria-hidden="true">arrow_forward</span>
                  )}
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
