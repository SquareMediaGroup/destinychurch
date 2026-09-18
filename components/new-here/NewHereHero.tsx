"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import { useScrollLock } from "@/lib/useScrollLock";

export default function NewHereHero() {
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  // Blob parallax
  useEffect(() => {
    let raf: number;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = (e.clientX - cx) / cx;
      targetY = (e.clientY - cy) / cy;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      if (blob1Ref.current)
        blob1Ref.current.style.transform = `translate(${currentX * -30}px, ${currentY * -20}px)`;
      if (blob2Ref.current)
        blob2Ref.current.style.transform = `translate(${currentX * 25}px, ${currentY * 18}px)`;
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Held so reopening inside the 350ms fade doesn't let the old timer tear the
  // new modal down, and so unmounting mid-fade doesn't leave it to fire.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useScrollLock(expanded);

  const open = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setExpanded(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  // Unlike the form modals, this one really does animate out: `expanded` stays
  // true for the length of the fade so the transition has something to run on.
  const close = useCallback(() => {
    setVisible(false);
    closeTimer.current = setTimeout(() => {
      setExpanded(false);
      closeTimer.current = null;
    }, 350);
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Only while open — a closed modal listening for Escape used to run the whole
  // close sequence, scroll unlock included, on any Escape anywhere on the page.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, close]);

  return (
    <>
      <section className="relative overflow-hidden bg-[#f5f7fa] pb-16 pt-36">
        {/* Blob 1 — left */}
        <div
          ref={blob1Ref}
          className="pointer-events-none absolute -left-64 -top-32 hidden h-[600px] w-[600px] rounded-full opacity-50 md:block md:h-[750px] md:w-[750px]"
          style={{ background: "#F58021", willChange: "transform" }}
          aria-hidden="true"
        />
        {/* Blob 2 — right */}
        <div
          ref={blob2Ref}
          className="pointer-events-none absolute -right-48 top-0 hidden h-[500px] w-[500px] rounded-full opacity-40 md:block md:h-[650px] md:w-[650px]"
          style={{ background: "#F58021", willChange: "transform" }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-3xl px-4 text-center lg:px-8">
          <AnimateIn>
            <h1 className="mb-10 text-5xl font-black text-destiny-grey md:text-6xl lg:text-7xl">
              <span className="relative inline-block">
                New Here?
                <Image
                  src="/img/brand/Scribble.webp"
                  alt=""
                  width={400}
                  height={47}
                  className="absolute left-1/2 w-[110%] -translate-x-[49%]"
                  style={{ bottom: "-0.5em" }}
                  aria-hidden="true"
                />
              </span>
            </h1>
          </AnimateIn>

          {/* Video card — clickable */}
          <AnimateIn delay={100}>
            <button
              onClick={open}
              className="group mx-auto mb-10 block w-full overflow-hidden rounded-3xl bg-black shadow-2xl transition-transform duration-300 hover:scale-[1.02]"
              style={{ maxWidth: 560 }}
              aria-label="Play welcome video"
            >
              <div className="flex aspect-video items-center justify-center">
                <div className="text-center">
                  <div className="mb-3 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destiny-orange shadow-lg shadow-destiny-orange/40 transition-transform duration-300 group-hover:scale-110">
                      <svg className="ml-1 h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-white">Welcome Video by Ps Jonathan and Cath</p>
                </div>
              </div>
            </button>
          </AnimateIn>

          {/* Strapline */}
          <AnimateIn delay={150}>
            <p className="text-lg font-medium leading-relaxed text-destiny-grey md:text-xl">
              We are so glad you&apos;ve found us! Wherever you&apos;ve come from and however you got here,
              we would love to help you get connected.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Fullscreen modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-350"
          style={{
            background: visible ? "rgba(0,0,0,0.92)" : "rgba(0,0,0,0)",
            transition: "background 0.35s ease",
          }}
          onClick={close}
        >
          <div
            className="relative w-full px-4 md:px-8"
            style={{
              maxWidth: "90vw",
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.85)",
              transition: "opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
              aria-label="Close video"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Video area */}
            <div className="overflow-hidden rounded-3xl bg-black shadow-2xl">
              <div className="flex aspect-video items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destiny-orange shadow-xl shadow-destiny-orange/40">
                      <svg className="ml-1.5 h-9 w-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-base font-bold text-white">Welcome Video by Ps Jonathan and Cath</p>
                  <p className="mt-2 text-sm text-on-dark-subtle">Video coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
