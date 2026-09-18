"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import Icon from "@/components/ui/Icon";
import { useAccessibility } from "@/contexts/AccessibilityContext";

interface Step {
  icon: string;
  title: string;
  time: string | null;
  body: string;
}

// Placeholder art — any photo we already have. Swap per-step once real
// photography for each moment of the walkthrough exists.
const HOVER_IMAGES = [
  "/img/photos/Gallery/Community.webp",
  "/img/photos/Gallery/SingingLand.webp",
  "/img/photos/Gallery/Speaker.webp",
  "/img/photos/Gallery/FamilySatTogether.webp",
  "/img/photos/Gallery/WorshipMoment.webp",
  "/img/photos/Gallery/Speaker2.webp",
];

const REST_ROTATE = 6; // degrees — the image's resting tilt when the cursor is still
const FOLLOW_EASE = 0.16; // how quickly the image catches up to the cursor
const ROTATE_EASE = 0.12; // how quickly the tilt settles after a fast swipe

/**
 * "Your first Sunday" timeline, plus a square preview image that trails the
 * cursor while hovering a step — desktop-only editorial flourish, so this
 * whole block (not just a slice of it) needs to be a client component for
 * the mouse tracking. The image itself rides a rAF loop rather than React
 * state, so mouse movement never triggers a re-render.
 */
export default function FirstSundayTimeline({ timeline }: { timeline: readonly Step[] }) {
  const { reducedMotion } = useAccessibility();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0, rotate: REST_ROTATE });
  const [hoverSrc, setHoverSrc] = useState<string | null>(null);

  useEffect(() => {
    if (reducedMotion) return;

    let raf = requestAnimationFrame(function animate() {
      const el = imageRef.current;
      if (el) {
        const dx = target.current.x - current.current.x;
        const dy = target.current.y - current.current.y;
        current.current.x += dx * FOLLOW_EASE;
        current.current.y += dy * FOLLOW_EASE;

        // Tilt tracks horizontal travel speed (dx, since we haven't moved yet
        // this frame) and settles back to the resting angle once still.
        const travelTilt = Math.max(-20, Math.min(20, dx * 0.8));
        const targetRotate = REST_ROTATE + travelTilt;
        current.current.rotate += (targetRotate - current.current.rotate) * ROTATE_EASE;

        el.style.transform = `translate(${current.current.x}px, ${current.current.y}px) translate(-50%, -60%) rotate(${current.current.rotate}deg)`;
      }
      raf = requestAnimationFrame(animate);
    });

    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    target.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseMove={reducedMotion ? undefined : handleMouseMove}
      onMouseLeave={() => setHoverSrc(null)}
    >
      <ol className="relative mx-auto mt-12 max-w-xl space-y-10">
        {timeline.map((step, i) => (
          <AnimateIn key={step.title} delay={i * 60}>
            <li
              className="relative flex flex-col items-center text-center"
              onMouseEnter={() =>
                setHoverSrc(HOVER_IMAGES[i % HOVER_IMAGES.length])
              }
            >
              {/* Connects this dot to the next one only — not a single line
                  for the whole list — so it stops short after the last
                  step. Decorative, so it's aria-hidden and excluded from
                  the list semantics. */}
              {i < timeline.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-6 hidden h-[calc(100%+2.5rem)] w-px -translate-x-1/2 bg-hairline sm:block"
                />
              )}
              <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destiny-orange text-white shadow-lg shadow-destiny-orange/25">
                <Icon name={step.icon} size="lg" />
              </div>
              <div className="mt-3">
                <div className="flex flex-wrap items-baseline justify-center gap-2">
                  <p className="font-black text-destiny-grey">{step.title}</p>
                  {step.time && (
                    <span className="text-xs font-bold uppercase tracking-wider text-destiny-orange">
                      {step.time}
                    </span>
                  )}
                </div>
                <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            </li>
          </AnimateIn>
        ))}
      </ol>

      {/* Cursor-follow preview — hidden below lg (no cursor to follow on
          touch) and entirely skipped under reduced motion. */}
      {!reducedMotion && (
        <div
          ref={imageRef}
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 z-20 hidden h-40 w-40 overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white transition-opacity duration-200 lg:block ${
            hoverSrc ? "opacity-100" : "opacity-0"
          }`}
        >
          {hoverSrc && (
            <Image
              src={hoverSrc}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
            />
          )}
        </div>
      )}
    </div>
  );
}
