"use client";

import { usePathname } from "next/navigation";
import { useLiveStatus } from "@/contexts/LiveContext";
import { isLinksPagePath, isSongRequestsPath } from "@/lib/linkPages/paths";
import { isLegalPagePath } from "@/lib/legalPages";
import { youtubeWatchUrl } from "@/lib/youtubeId";

export default function LiveBanner() {
  const { live, videoId } = useLiveStatus();
  const pathname = usePathname();

  if (!live) return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/portal")) return null;
  if (pathname === "/login") return null;
  if (isLinksPagePath(pathname) || isSongRequestsPath(pathname)) return null;
  if (isLegalPagePath(pathname)) return null;

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
      <a
        href={youtubeWatchUrl(videoId)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-bold text-white underline underline-offset-2 transition hover:no-underline"
      >
        Watch now →
      </a>
    </div>
  );
}
