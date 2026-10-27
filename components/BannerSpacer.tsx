"use client";

import { usePathname } from "next/navigation";
import { isLinksPagePath, isSongRequestsPath, isTalentShowPath } from "@/lib/linkPages/paths";
import { useBannerBars } from "@/lib/useBannerBars";

export default function BannerSpacer() {
  const pathname = usePathname();
  const bars = useBannerBars();

  if (pathname === "/") return null;
  // Chrome-free pages show no banners, so there is nothing to make room for.
  if (isLinksPagePath(pathname) || isSongRequestsPath(pathname) || isTalentShowPath(pathname)) return null;
  if (bars === 0) return null;

  return (
    <div
      className="shrink-0"
      style={{ height: bars * 40 }}
      aria-hidden="true"
    />
  );
}
