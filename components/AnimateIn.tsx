"use client";

import { useEffect, useRef, useState } from "react";

interface AnimateInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}

// Three states:
// "initial" — server render + pre-mount: element is visible (no hiding CSS applied)
// "pending" — mounted, below the fold: element is hidden, waiting to enter viewport
// "visible" — in viewport: animation plays
type AnimateState = "initial" | "pending" | "visible";

/** How much of the element must be showing before the entrance animation plays. */
const VISIBLE_RATIO = 0.1;

export default function AnimateIn({
  children,
  className = "",
  delay = 0,
  once = true,
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<AnimateState>("initial");

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
    <div
      ref={ref}
      className={`${stateClass} ${className}`.trim()}
      style={delay && state === "visible" ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
