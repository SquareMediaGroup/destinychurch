"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/shop";

// Product image gallery: a large main image with a thumbnail strip below.
export default function ProductGallery({
  images,
  name,
}: {
  images: ProductImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl border border-black/10 bg-[#f5f7fa]">
        <span className="material-symbols-rounded text-6xl text-destiny-grey/20">
          checkroom
        </span>
      </div>
    );
  }

  const main = images[Math.min(active, images.length - 1)];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-black/10 bg-[#f5f7fa]">
        <Image
          src={main.url}
          alt={main.alt || name}
          fill
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-cover"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {images.map((img, i) => (
            <button
              key={img.path || i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === active
                  ? "border-destiny-orange"
                  : "border-black/10 hover:border-black/25"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <Image
                src={img.url}
                alt={img.alt || `${name} thumbnail ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
