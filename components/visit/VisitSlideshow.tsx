"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const photos = [
  "/img/photos/WorshipMoment1.webp",
  "/img/photos/Gallery/SN1_7825.CR2.webp",
  "/img/photos/Community.webp",
  "/img/photos/Gallery/SN1_7862.CR2.webp",
  "/img/photos/ConnectGroups.webp",
  "/img/photos/Gallery/SN1_7897.CR2.webp",
  "/img/photos/WorshipMoment2.webp",
  "/img/photos/Gallery/SN1_7941.CR2.webp",
];

const MARQUEE_TEXT = "TRANSFORMING LIVES • TRANSFORMING LIVES • TRANSFORMING LIVES • TRANSFORMING LIVES • ";

export default function VisitSlideshow() {
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

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => goTo(1), 6000);
    return () => clearInterval(timer);
  }, []);

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
      className="relative h-[728px] w-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
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

      {/* Scrolling text */}
      <div className="absolute inset-0 flex flex-col justify-center pointer-events-none gap-3">
        {/* Row 1 — scrolls left */}
        <div className="overflow-hidden">
          <div
            className="flex w-max"
            style={{ animation: "visit-marquee 120s linear infinite", willChange: "transform" }}
          >
            <span className="text-[12vw] font-black uppercase leading-none tracking-tight text-white/90 pr-[6vw]">
              {MARQUEE_TEXT}
            </span>
            <span className="text-[12vw] font-black uppercase leading-none tracking-tight text-white/90 pr-[6vw]" aria-hidden="true">
              {MARQUEE_TEXT}
            </span>
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="overflow-hidden">
          <div
            className="flex w-max"
            style={{ animation: "visit-marquee 120s linear infinite reverse", willChange: "transform" }}
          >
            <span className="text-[12vw] font-black uppercase leading-none tracking-tight text-white/90 pr-[6vw]">
              {MARQUEE_TEXT}
            </span>
            <span className="text-[12vw] font-black uppercase leading-none tracking-tight text-white/90 pr-[6vw]" aria-hidden="true">
              {MARQUEE_TEXT}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
