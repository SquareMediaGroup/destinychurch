"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveStatus } from "@/contexts/LiveContext";

export default function LiveBanner() {
  const { live } = useLiveStatus();
  const pathname = usePathname();

  if (!live) return null;
  if (pathname === "/live") return null;
  if (pathname.startsWith("/admin")) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[60] flex h-10 items-center justify-center gap-3 px-4"
      style={{ backgroundColor: "var(--color-destiny-red)", top: 0 }}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span className="text-[11px] font-black uppercase tracking-[0.32em] text-white">
        We are live
      </span>
      <span aria-hidden="true" className="h-3 w-px bg-white/40" />
      <Link
        href="/live"
        className="text-sm font-bold text-white underline underline-offset-2 transition hover:no-underline"
      >
        Watch now →
      </Link>
    </div>
  );
}
