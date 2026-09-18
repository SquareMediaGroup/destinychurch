"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";

interface AnimateInProps {
  children: ReactNode;
  className?: string;
  /** Explicit delay in ms. Wins over `index` when both are given. */
  delay?: number;
  /**
   * Position in a staggered group — `delay` is derived as
   * `min(index * 60, 300)`, capped so a long list doesn't take seconds to
   * finish entering. Replaces the seven different hand-tuned stagger rhythms
   * (50/60/80/100/150/160/200/230ms steps) that had accumulated across call
   * sites with one scale. Ignored if `delay` is also given.
   */
  index?: number;
  once?: boolean;
  /**
   * Render as something other than a `<div>`. AnimateIn wraps a single group
   * rather than individual cells in most grids for exactly this reason — a
   * `<div>` can silently break `display: grid`/`flex` semantics for its
   * siblings. Call sites that DID wrap individual cells worked around it with
   * `className="flex"` on the wrapper (see app/visit's when-and-where cards)
   * or happened to get away with it because a `<div>` is a valid grid item on
   * its own. `as="li"` etc. covers the cases where the wrapper's element type
   * actually matters, without a patch className at each call site.
   */
  as?: ElementType;
}

// Three states:
// "initial" — server render + pre-mount: element is visible (no hiding CSS applied)
// "pending" — mounted, below the fold: element is hidden, waiting to enter viewport
// "visible" — in viewport: animation plays
type AnimateState = "initial" | "pending" | "visible";

/** How much of the element must be showing before the entrance animation plays. */
const VISIBLE_RATIO = 0.1;

/** The shared stagger scale `index` derives a delay from. */
const STAGGER_STEP_MS = 60;
const STAGGER_MAX_MS = 300;

export default function AnimateIn({
  children,
  className = "",
  delay,
  index,
  once = true,
  as: Tag = "div",
}: AnimateInProps) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<AnimateState>("initial");

  const resolvedDelay =
    delay ?? (index !== undefined ? Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_MS) : 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // The observer's own first callback tells us whether the element started in
    // view, so there is no getBoundingClientRect() here. With ~300 of these on a
    // page that measurement was ~300 forced synchronous layouts during mount.
    //
    // Two thresholds, one observer: ratio > 0 ("any overlap") is the mount test,
    // and 0.1 is what actually triggers the animation.
    let seenFirstEntry = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!seenFirstEntry) {
          seenFirstEntry = true;
          if (entry.isIntersecting) {
            // Already visible on mount — stay "initial", no animation needed.
            observer.disconnect();
            return;
          }
        }

        if (entry.intersectionRatio >= VISIBLE_RATIO) {
          setState("visible");
          if (once) observer.disconnect();
        } else {
          // Below the fold, or scrolled back out when once=false.
          setState("pending");
        }
      },
      { threshold: [0, VISIBLE_RATIO] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const stateClass =
    state === "pending" ? "animate-pending" :
    state === "visible" ? "animate-in is-visible" :
    ""; // "initial" — no class, fully visible

  return (
    <Tag
      ref={ref}
      className={`${stateClass} ${className}`.trim()}
      style={
        resolvedDelay && state === "visible"
          ? { animationDelay: `${resolvedDelay}ms` }
          : undefined
      }
    >
      {children}
    </Tag>
  );
}
