"use client";

import { usePathname } from "next/navigation";
import { useBanner, type BannerData } from "@/contexts/BannerContext";
import { useLiveStatus } from "@/contexts/LiveContext";
import { isCourseEventType } from "@/lib/courseEvents";

const isVisible = (b: BannerData) => {
  if (!b.active) return false;
  if (isCourseEventType(b.type)) return !!b.alpha;
  return !!b.message;
};

/** Counts the stacked 40px banner bars currently visible (live bar first, then DB banners). */
export function useBannerBars(): number {
  const banner = useBanner();
  const live = useLiveStatus();
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return 0;
  if (banner.active && banner.type === "sitewide") return 0;

  let count = 0;
  if (live.live && pathname !== "/live") count += 1;
  if (isVisible(banner)) count += 1;
  if (banner.companion && isVisible(banner.companion)) count += 1;

  return count;
}
