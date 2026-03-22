"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBanner } from "@/contexts/BannerContext";

export default function SiteBanner() {
  const banner = useBanner();
  const pathname = usePathname();

  if (!banner.active || !banner.message) return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/sermons")) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] flex h-10 items-center justify-center gap-3 bg-destiny-orange px-4">
      <span className="material-symbols-rounded text-sm text-white/80">campaign</span>
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
