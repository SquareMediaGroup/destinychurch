// Artwork for an event card, including the two no-artwork fallbacks.
//
// Roughly half the ChurchSuite feed has no image at all, so the fallback is a
// first-class state rather than an afterthought — it shows the date at poster
// scale so an artwork-less card still reads as an event.

import Image from "next/image";
import { eventImage, formatDayChip, type EventSeries } from "@destiny/shared";
import type { EventCardVariant } from "@/lib/events";

export default function EventCardArtwork({
  event,
  variant,
  priority,
  sizes,
}: {
  event: EventSeries;
  variant: EventCardVariant;
  priority?: boolean;
  sizes?: string;
}) {
  const url = eventImage(event.primary, variant === "c" ? "hero" : "card");
  const { day, month } = formatDayChip(event.primary.datetime_start);

  if (variant === "c") {
    return url ? (
      <Image
        src={url}
        alt=""
        fill
        priority={priority}
        sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
    ) : (
      // Brand panel with an oversized ghost numeral, so the poster silhouette
      // survives even with nothing to show.
      <div className="absolute inset-0 bg-destiny-orange">
        <span
          aria-hidden
          className="absolute -right-4 top-2 text-[160px] font-black leading-none text-white/15"
        >
          {day}
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f5f7fa]">
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          priority={priority}
          sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center">
          <span className="text-[52px] font-black leading-none tracking-[-0.03em] text-destiny-grey/25">
            {day}
          </span>
          <span className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-destiny-grey/35">
            {month}
          </span>
        </div>
      )}
    </div>
  );
}
