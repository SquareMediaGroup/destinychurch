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

    const rect = el.getBoundingClientRect();
    const alreadyInView = rect.top < window.innerHeight && rect.bottom > 0;

    if (alreadyInView) {
      // Already visible on mount — show immediately, no animation needed
      setState("visible");
      return;
    }

    // Below the fold — hide it and wait for scroll
    setState("pending");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible");
          if (once) observer.disconnect();
        } else if (!once) {
          setState("pending");
        }
      },
      { threshold: 0.1 }
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
