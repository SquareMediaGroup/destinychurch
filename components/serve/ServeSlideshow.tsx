"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAccessibility } from "@/contexts/AccessibilityContext";

const photos = [
  { src: "/img/photos/WorshipTeam.webp", alt: "The worship team singing on stage" },
  { src: "/img/photos/audience.webp", alt: "" },
  { src: "/img/photos/worship-dc.webp", alt: "" },
  { src: "/img/photos/Training_DC-scaled.webp", alt: "" },
];

// Replaces the three-photo bento on /serve: one frame that slowly crossfades
// between team photos. Auto-advance stops under "Reduce animations" (or the
// OS setting), and the dots keep every photo reachable either way.
export default function ServeSlideshow() {
  const { reducedMotion } = useAccessibility();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % photos.length), 5000);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
      {photos.map((photo, i) => (
        <Image
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={`object-cover transition-opacity duration-[1200ms] ease-in-out ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i === current ? undefined : true}
          priority={i === 0}
        />
      ))}

      {/* Padding on the button, not the bar, so each dot is a usable tap
          target without the indicator itself getting any heavier. */}
      <div className="absolute inset-x-0 bottom-2 flex justify-center">
        {photos.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`Show photo ${i + 1} of ${photos.length}`}
            aria-current={i === current ? "true" : undefined}
            className="group p-2"
          >
            <span
              className={`block h-1.5 rounded-full bg-white transition-all duration-300 ${
                i === current ? "w-6 opacity-100" : "w-1.5 opacity-60 group-hover:opacity-90"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
