"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Sermons",        href: "/sermons"               },
  { label: "Guest Speakers", href: "/sermons/guest-speakers" },
];

export default function SermonsTabBar() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0f0f0f]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 lg:px-8">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative py-3.5 px-4 text-sm font-bold transition-colors ${
                active ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-destiny-orange" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
