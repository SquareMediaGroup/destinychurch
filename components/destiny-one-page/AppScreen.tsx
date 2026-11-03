import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * One Destiny One screen, as a floating rounded screen rather than inside a
 * drawn phone.
 *
 * The campaign films use Apple's own iPhone bezels, but Apple's licence covers
 * those only for mock-ups of software that runs solely on Apple platforms, and
 * Destiny One is on Android too (and this page has a Google Play button). A
 * hand-drawn phone always looks slightly off, so the screen stands on its own.
 *
 * The corner radius is the iPhone's display radius (55pt on a 402pt-wide
 * screen) as an elliptical percentage, so it stays true at every size:
 * 55/402 = 13.7% across and 55/812 = 6.8% down for these 402x812 captures.
 *
 * The screenshots are the real app (its web build) with sample people; see
 * apps/campaign-videos/capture/destiny-one-sample-data.cjs.
 */
export default function AppScreen({
  src,
  alt,
  priority = false,
  sizes = "(min-width: 1024px) 300px, 60vw",
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[402/812] overflow-hidden rounded-[13.7%/6.8%] bg-white ring-1 ring-black/[0.08] shadow-[0_2px_6px_rgba(16,24,40,.06),0_24px_60px_-20px_rgba(16,24,40,.28)]",
        className,
      )}
    >
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
    </div>
  );
}
