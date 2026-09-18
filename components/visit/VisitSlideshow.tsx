"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAccessibility } from "@/contexts/AccessibilityContext";

const photos = [
  "/img/photos/WorshipMoment1.webp",
  "/img/photos/Gallery/SingingLand.webp",
  "/img/photos/Community.webp",
  "/img/photos/Gallery/FamilySatTogether.webp",
  "/img/photos/ConnectGroups.webp",
  "/img/photos/Gallery/Speaker.webp",
  "/img/photos/WorshipMoment2.webp",
  "/img/photos/Gallery/YouthCommunity.webp",
];

const MARQUEE_TEXT = "TRANSFORMING LIVES • TRANSFORMING LIVES • TRANSFORMING LIVES • TRANSFORMING LIVES • ";

export default function VisitSlideshow() {
  // Everything that moves in here is decorative, and all of it moved
  // permanently: two 120-second marquees on an infinite loop plus a 6-second
  // auto-advance, with no way to stop any of it. That is WCAG 2.2.2 territory.
  // The site already offers the control — /accessibility "Reduce animations",
  // which also mirrors the OS setting when the visitor has not chosen — so the
  // fix is to actually honour it here.
  const { reducedMotion } = useAccessibility();
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const dragStart = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = (dir: 1 | -1) => {
    setDirection(dir);
    setCurrent((c) => {
      setPrev(c);
      return (c + dir + photos.length) % photos.length;
    });
    setTick((t) => t + 1);
  };

  // Auto-advance. Still draggable when stopped, so the photos stay reachable.
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => goTo(1), 6000);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  // Preload next image
  useEffect(() => {
    const nextIndex = (current + 1) % photos.length;
    const img = new window.Image();
    img.src = photos[nextIndex];
  }, [current]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientX;
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    const delta = e.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(delta) > 60) {
      goTo(delta < 0 ? 1 : -1);
    }
  };

  const wipeAnim = direction === 1 ? "visit-wipe-right" : "visit-wipe-left";

  return (
    <div
      ref={containerRef}
      /* Was a flat h-[728px] at every breakpoint: taller than the viewport on
         a phone and taller than a landscape window. Steps now, and caps at the
         viewport height so it can never be the thing you have to scroll past
         twice. */
      className="relative h-[60vh] max-h-[728px] min-h-[380px] w-full cursor-grab select-none overflow-hidden active:cursor-grabbing sm:h-[70vh]"
      style={{ isolation: "isolate" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Previous image */}
      {prev !== null && (
        <div key={`prev-${prev}`} className="absolute inset-0">
          <Image
            src={photos[prev]}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Current image — wipes in */}
      <div
        key={`curr-${tick}`}
        className="absolute inset-0"
        style={{
          animation:
            tick === 0
              ? "none"
              : `${wipeAnim} 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        }}
      >
        <Image
          src={photos[current]}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          aria-hidden="true"
          priority={current === 0}
        />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Scrolling text. aria-hidden on the whole block: it is a decorative
          typographic band, and the phrase repeats four times per row across two
          rows — announcing that is noise, not content. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col justify-center pointer-events-none gap-3"
      >
        {/* Row 1 — scrolls left */}
        <div className="overflow-hidden">
          <div
            className="flex w-max"
            style={
              reducedMotion
                ? undefined
                : { animation: "visit-marquee 120s linear infinite", willChange: "transform" }
            }
          >
            <span className="text-[12vw] font-black uppercase leading-none tracking-tight text-white/90 pr-[6vw]">
              {MARQUEE_TEXT}
            </span>
            <span className="text-[12vw] font-black uppercase leading-none tracking-tight text-white/90 pr-[6vw]">
              {MARQUEE_TEXT}
            </span>
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="overflow-hidden">
          <div
            className="flex w-max"
            style={
              reducedMotion
                ? undefined
                : {
                    animation: "visit-marquee 120s linear infinite reverse",
                    willChange: "transform",
                  }
            }
          >
            <span className="text-[12vw] font-black uppercase leading-none tracking-tight text-white/90 pr-[6vw]">
              {MARQUEE_TEXT}
            </span>
            <span className="text-[12vw] font-black uppercase leading-none tracking-tight text-white/90 pr-[6vw]">
              {MARQUEE_TEXT}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
