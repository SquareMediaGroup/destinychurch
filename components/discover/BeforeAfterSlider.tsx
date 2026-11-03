"use client";

import Image from "next/image";
import { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Drag the handle to compare the old page with the new one.
 *
 * The new page sits underneath and the old one on top, clipped from the left,
 * so "After" is always to the left of the handle and "Before" to the right.
 * That matches the campaign film's wipe and the stills in
 * apps/campaign-videos/stills/before-after/.
 *
 * Input: drag or tap anywhere on the image with a mouse, pen or finger
 * (pointer capture, so the drag survives leaving the box), or use the slider
 * itself from the keyboard, where the arrow keys move 5% and Home/End jump to
 * the ends. The slider is a real `<input type="range">`, visually hidden, so
 * screen readers announce it as one; its focus ring is drawn on the handle.
 */
export default function BeforeAfterSlider({
  before,
  after,
  label,
  aspect = "1512 / 982",
  sizes = "(min-width: 1280px) 1152px, 100vw",
  rounded = "rounded-2xl",
  bare = false,
  className,
}: {
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  /** What is being compared, e.g. "the home page". Read out with the slider. */
  label: string;
  /** CSS aspect-ratio of both images. */
  aspect?: string;
  sizes?: string;
  rounded?: string;
  /** Inside a device frame: fill the parent, no ring or rounding of its own. */
  bare?: boolean;
  className?: string;
}) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const id = useId();

  const moveTo = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  return (
    <div className={cn(bare && "h-full", className)}>
      <div
        ref={box}
        className={cn(
          "group relative w-full touch-pan-y select-none overflow-hidden bg-[#f5f7fa]",
          bare ? "h-full" : cn("ring-1 ring-black/[0.08]", rounded),
        )}
        style={{ aspectRatio: bare ? undefined : aspect, cursor: "ew-resize" }}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          moveTo(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <Image src={after.src} alt={after.alt} fill sizes={sizes} className="object-cover object-top" draggable={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <Image src={before.src} alt={before.alt} fill sizes={sizes} className="object-cover object-top" draggable={false} />
        </div>

        <span
          className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-destiny-grey/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-opacity"
          style={{ opacity: pos > 12 ? 1 : 0 }}
          aria-hidden
        >
          After
        </span>
        <span
          className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-destiny-grey/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-opacity"
          style={{ opacity: pos < 88 ? 1 : 0 }}
          aria-hidden
        >
          Before
        </span>

        {/* The handle */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }} aria-hidden>
          <div className="absolute inset-y-0 -ml-px w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.08)]" />
          <div className="absolute top-1/2 -ml-6 -mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-white text-destiny-grey shadow-lg ring-destiny-orange ring-offset-2 group-has-[input:focus-visible]:ring-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>

        <label htmlFor={id} className="sr-only">
          Compare {label}: the new website to the left of the handle, the old one to the right
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(pos)}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-valuetext={`${Math.round(pos)}% new website, ${100 - Math.round(pos)}% old website`}
          className="sr-only"
        />
      </div>
    </div>
  );
}
