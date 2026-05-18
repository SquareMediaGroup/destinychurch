"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const photos = [
  "/img/photos/ConnectGroups.webp",
  "/img/photos/WorshipWUs.webp",
  "/img/photos/WorshipMoment1.webp",
  "/img/photos/WorshipMoment2.webp",
  "/img/photos/Prayer1.webp",
  "/img/photos/Community.webp",
  "/img/photos/Kids2.webp",
  "/img/photos/YA1.webp",
  "/img/photos/EHAP_Youth.webp",
  "/img/photos/Plan a Visit.webp",
  "/img/photos/Yannick Baptism Photo.webp",
  "/img/photos/Elders.webp",
];

const imgStyle = {
  filter: "grayscale(100%) blur(5px)",
  transform: "scale(1.08)",
};

export default function MissionSlideshow() {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  // Preload the next image before it's needed
  useEffect(() => {
    const nextIndex = (current + 1) % photos.length;
    const img = new window.Image();
    img.src = photos[nextIndex];
  }, [current]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => {
        setPrev(c);
        return (c + 1) % photos.length;
      });
      setTick((t) => t + 1);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl" style={{ isolation: "isolate" }}>
      {/* Previous image — stays underneath */}
      {prev !== null && (
        <div key={`prev-${prev}`} className="absolute inset-0" style={{ opacity: 0.85 }}>
          <Image
            src={photos[prev]}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            style={imgStyle}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Current image — wipes in on top */}
      <div
        key={`curr-${tick}`}
        className="absolute inset-0"
        style={{
          opacity: 0.85,
          animation:
            tick === 0
              ? "none"
              : "mission-wipe-in 1.65s cubic-bezier(0.9, 0, 0.1, 1) forwards",
        }}
      >
        <Image
          src={photos[current]}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          style={imgStyle}
          aria-hidden="true"
          loading="lazy"
        />
      </div>
    </div>
  );
}
