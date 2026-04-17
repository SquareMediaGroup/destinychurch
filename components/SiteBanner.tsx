"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBanner } from "@/contexts/BannerContext";

function getContrastColor(hex: string): "black" | "white" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? "black" : "white";
}

export default function SiteBanner() {
  const banner = useBanner();
  const pathname = usePathname();

  const isAdmin = pathname.startsWith("/admin");
  const isSitewideActive = banner.active && banner.message && banner.type === "sitewide" && !isAdmin;

  useEffect(() => {
    if (isSitewideActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isSitewideActive]);

  if (!banner.active || !banner.message) return null;

  // Sitewide (maintenance) banner — full-screen block on all non-admin pages
  if (banner.type === "sitewide") {
    if (isAdmin) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#111] px-6 text-center">
        <span className="material-symbols-rounded mb-6 text-6xl text-white/20">build</span>
        <h1 className="mb-3 text-2xl font-black text-white">We'll be back soon</h1>
        <p className="max-w-sm text-base leading-relaxed text-white/60">{banner.message}</p>
        {banner.link && (
          <Link
            href={banner.link}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
          >
            {banner.link_text ?? "Learn more"}
            <span className="material-symbols-rounded text-sm">arrow_forward</span>
          </Link>
        )}
      </div>
    );
  }

  // Announcement and Notice banners — slim top bar, hidden on admin + sermons
  if (isAdmin || pathname.startsWith("/sermons")) return null;

  const isNotice = banner.type === "notice";
  const isAnnouncement = banner.type === "announcement";

  const customColor = isAnnouncement && banner.custom_color ? banner.custom_color : null;
  const textColor = customColor ? getContrastColor(customColor) : "white";
  const textClass = textColor === "black" ? "text-black/80" : "text-white/80";
  const textClassSolid = textColor === "black" ? "text-black" : "text-white";

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-[60] flex h-10 items-center justify-center gap-3 px-4 ${
        customColor ? "" : isNotice ? "bg-[#6b7280]" : "bg-destiny-orange"
      }`}
      style={customColor ? { backgroundColor: customColor } : undefined}
    >
      <span className={`material-symbols-rounded text-sm ${textClass}`}>
        {isNotice ? "info" : "campaign"}
      </span>
      <p className={`text-sm font-medium ${textClassSolid}`}>
        {banner.message}
        {banner.link && (
          <Link
            href={banner.link}
            className="ml-2 inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:no-underline"
          >
            {banner.link_text ?? "Learn more"}
            <span className="material-symbols-rounded text-xs">arrow_forward</span>
          </Link>
        )}
      </p>
    </div>
  );
}
