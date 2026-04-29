"use client";

import { usePathname } from "next/navigation";
import { useBanner } from "@/contexts/BannerContext";

export default function BannerSpacer() {
  const banner = useBanner();
  const pathname = usePathname();

  if (!banner.active) return null;
  // Alpha banner has no message field but still occupies the bar
  if (banner.type !== "alpha" && banner.type !== "youth_alpha" && !banner.message) return null;
  if ((banner.type === "alpha" || banner.type === "youth_alpha") && !banner.alpha) return null;
  if (banner.type === "sitewide") return null;
  if (pathname === "/") return null;
  if (pathname.startsWith("/admin")) return null;

  return <div className="h-10 shrink-0" aria-hidden="true" />;
}
