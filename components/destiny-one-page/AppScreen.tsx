import Image from "next/image";
import { IPhoneFrame } from "@/components/devices/DeviceFrames";

/**
 * One Destiny One screen inside Apple's iPhone 18 Pro frame (see the licence
 * note in components/devices/DeviceFrames.tsx).
 *
 * The screenshots are the real app (its web build) with sample people, captured
 * at 402x812pt below the status bar; see
 * apps/campaign-videos/capture/destiny-one-sample-data.cjs.
 */
export default function AppScreen({
  src,
  alt,
  priority = false,
  dark = false,
  color = "silver",
  sizes = "(min-width: 1024px) 300px, 60vw",
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  /** A dark-mode screenshot: dark status bar. */
  dark?: boolean;
  color?: "silver" | "black";
  sizes?: string;
  className?: string;
}) {
  return (
    <IPhoneFrame dark={dark} color={color} className={className}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
    </IPhoneFrame>
  );
}
