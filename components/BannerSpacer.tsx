"use client";

import { usePathname } from "next/navigation";
import { useBanner } from "@/contexts/BannerContext";

export default function BannerSpacer() {
  const banner = useBanner();
  const pathname = usePathname();

  if (!banner.active) return null;
  if (banner.type === "sitewide") return null;
  if (pathname === "/") return null;
  if (pathname.startsWith("/admin")) return null;

  const isAlphaType = (t: string) => t === "alpha" || t === "youth_alpha";
  const isVisible = (b: typeof banner) => {
    if (!b.active) return false;
    if (isAlphaType(b.type)) return !!b.alpha;
    return !!b.message;
  };

  let visibleCount = 0;
  if (isVisible(banner)) visibleCount += 1;
  if (banner.companion && isVisible(banner.companion)) visibleCount += 1;

  if (visibleCount === 0) return null;

  return (
    <div
      className="shrink-0"
      style={{ height: visibleCount * 40 }}
      aria-hidden="true"
    />
  );
}
