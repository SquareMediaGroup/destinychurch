"use client";

import { useId, useRef, useState } from "react";
import BeforeAfterSlider from "@/components/discover/BeforeAfterSlider";
import { MacBookFrame } from "@/components/devices/DeviceFrames";
import { cn } from "@/lib/cn";

export interface Comparison {
  key: string;
  /** Tab label, e.g. "Home". */
  name: string;
  /** Read out with the slider, e.g. "the home page". */
  label: string;
  /** One line under the slider about what changed. */
  note: string;
}

/**
 * Tabs across the top, one before/after slider underneath. Images are
 * /img/discover/<key>-before.webp and -after.webp (1512x982pt captures, @2x
 * scaled to 2400px wide). Arrow keys move between tabs (the WAI-ARIA tabs
 * pattern, automatic activation).
 */
export default function BeforeAfterGallery({ items }: { items: Comparison[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const item = items[active];

  const select = (i: number) => {
    const next = (i + items.length) % items.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Pages to compare" className="mb-6 flex flex-wrap justify-center gap-2">
        {items.map((it, i) => (
          <button
            key={it.key}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`${base}-tab-${it.key}`}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls={`${base}-panel`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") select(i + 1);
              else if (e.key === "ArrowLeft") select(i - 1);
              else if (e.key === "Home") select(0);
              else if (e.key === "End") select(items.length - 1);
              else return;
              e.preventDefault();
            }}
            className={cn(
              "min-h-[44px] rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange focus-visible:ring-offset-2",
              i === active ? "bg-destiny-grey text-white" : "bg-white text-destiny-grey ring-1 ring-black/10 hover:ring-black/25",
            )}
          >
            {it.name}
          </button>
        ))}
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${item.key}`}>
        <MacBookFrame className="mx-auto w-full max-w-6xl">
          <BeforeAfterSlider
            key={item.key}
            bare
            label={item.label}
            sizes="(min-width: 1280px) 940px, 80vw"
            before={{ src: `/img/discover/${item.key}-before.webp`, alt: `The old ${item.label}` }}
            after={{ src: `/img/discover/${item.key}-after.webp`, alt: `The new ${item.label}` }}
          />
        </MacBookFrame>
        <p className="mt-4 text-center text-sm leading-relaxed text-muted">{item.note}</p>
      </div>
    </div>
  );
}
