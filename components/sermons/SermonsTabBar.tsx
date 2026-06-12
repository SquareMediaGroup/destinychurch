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
    <div className="border-b border-white/[0.06] bg-[#0f0f0f]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <div className="glass glass-sm flex items-center rounded-full p-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${
                  active
                    ? "bg-white text-[#0d0d0d] shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
