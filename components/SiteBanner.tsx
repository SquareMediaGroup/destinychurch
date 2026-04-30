"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBanner } from "@/contexts/BannerContext";
import type { BannerData } from "@/contexts/BannerContext";
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

  // Sitewide (maintenance) banner — full-screen block on all non-admin pages
  if (banner.active && banner.type === "sitewide" && banner.message) {
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

  if (isAdmin) return null;
  if (!banner.active) return null;

  const primary = renderBanner(banner, 0);
  const companion = banner.companion?.active
    ? renderBanner(banner.companion, 1)
    : null;

  if (!primary && !companion) return null;

  return (
    <>
      {primary}
      {companion}
    </>
  );
}

function renderBanner(banner: BannerData, index: number) {
  const top = index * 40; // each bar is h-10 (40px)

  if (
    banner.type === "alpha" ||
    banner.type === "youth_alpha" ||
    banner.type === "recovery"
  ) {
    if (!banner.alpha) return null;
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
    const defaultHref =
      banner.type === "youth_alpha"
        ? "/youth-alpha"
        : banner.type === "recovery"
        ? "/destiny-recovery"
        : "/alpha";
    const linkHref = banner.link || defaultHref;
    const linkText = banner.link_text || "Sign up";
    const defaultEyebrow =
      banner.type === "youth_alpha"
        ? "Youth Alpha"
        : banner.type === "recovery"
        ? "Destiny Recovery"
        : "Alpha";
    const eyebrow = banner.message?.trim() || defaultEyebrow;
    const cadenceLabel = isFirst ? "Starting" : "Next session";
    const bg =
      banner.type === "youth_alpha"
        ? "#b81313"
        : banner.type === "recovery"
        ? "#006756"
        : "#e51b1b";

    return (
      <div
        key={`${banner.type}-${index}`}
        className="fixed left-0 right-0 z-[60] flex h-10 items-center justify-center gap-3 px-4"
        style={{ backgroundColor: bg, top }}
      >
        <span className="text-[11px] font-black uppercase tracking-[0.32em] text-white">
          {eyebrow}
        </span>
        <span aria-hidden="true" className="h-3 w-px bg-white/40" />
        <p className="text-sm text-white">
          {cadenceLabel} <span className="font-bold">{dateLabel}</span>
        </p>
        <Link
          href={linkHref}
          className="ml-1 text-sm font-bold text-white underline underline-offset-2 transition hover:no-underline"
        >
          {linkText} →
        </Link>
      </div>
    );
  }

  if (!banner.message) return null;

  const isNotice = banner.type === "notice";
  return (
    <div
      key={`${banner.type}-${index}`}
      className={`fixed left-0 right-0 z-[60] flex h-10 items-center justify-center gap-3 px-4 ${
        isNotice ? "bg-[#6b7280]" : "bg-destiny-orange"
      }`}
      style={{ top }}
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
