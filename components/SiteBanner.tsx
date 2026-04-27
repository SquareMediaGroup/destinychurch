"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBanner } from "@/contexts/BannerContext";
import { getNextAlphaSession } from "@/lib/alphaSession";

export default function SiteBanner() {
  const banner = useBanner();
  const pathname = usePathname();

  const isAdmin = pathname.startsWith("/admin");
  const isSitewideActive =
    banner.active && banner.message && banner.type === "sitewide" && !isAdmin;

  useEffect(() => {
    if (isSitewideActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSitewideActive]);

  // Alpha banner — pulls from the active Alpha event, no message required
  if (banner.active && banner.type === "alpha" && !isAdmin && banner.alpha) {
    const { date, isFirst } = getNextAlphaSession(
      banner.alpha.start_date,
      banner.alpha.frequency,
      banner.alpha.custom_interval_days
    );
    const dateLabel = date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
    const linkHref = banner.link || "/alpha";
    const linkText = banner.link_text || "Sign up";
    const intro = banner.message?.trim() || "Alpha";
    const cadenceLabel = isFirst ? "Starting" : "Next session";

    return (
      <div
        className="fixed left-0 right-0 top-0 z-[60] flex h-10 items-center justify-center gap-3 px-4"
        style={{
          background:
            "linear-gradient(90deg, #2a0404 0%, #3a0606 50%, #2a0404 100%)",
        }}
      >
        <span
          aria-hidden="true"
          className="text-[11px] font-black uppercase tracking-[0.32em] text-destiny-orange"
        >
          {intro}
        </span>
        <span aria-hidden="true" className="h-3 w-px bg-white/20" />
        <p className="text-sm font-medium text-white/90">
          {cadenceLabel}{" "}
          <span
            className="italic font-normal text-white"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            {dateLabel}
          </span>
        </p>
        <Link
          href={linkHref}
          className="ml-1 inline-flex items-center gap-1 text-sm font-bold text-destiny-orange underline-offset-2 transition hover:text-white hover:underline"
        >
          {linkText}
          <span className="material-symbols-rounded text-xs">arrow_forward</span>
        </Link>
      </div>
    );
  }

  if (!banner.active || !banner.message) return null;

  // Sitewide (maintenance) banner — full-screen block on all non-admin pages
  if (banner.type === "sitewide") {
    if (isAdmin) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#111] px-6 text-center">
        <span className="material-symbols-rounded mb-6 text-6xl text-white/20">build</span>
        <h1 className="mb-3 text-2xl font-black text-white">We&apos;ll be back soon</h1>
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

  // Announcement and Notice banners — slim top bar, hidden on admin
  if (isAdmin) return null;

  const isNotice = banner.type === "notice";

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-[60] flex h-10 items-center justify-center gap-3 px-4 ${
        isNotice ? "bg-[#6b7280]" : "bg-destiny-orange"
      }`}
    >
      <span className="material-symbols-rounded text-sm text-white/80">
        {isNotice ? "info" : "campaign"}
      </span>
      <p className="text-sm font-medium text-white">
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
