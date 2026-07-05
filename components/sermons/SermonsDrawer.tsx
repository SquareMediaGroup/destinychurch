"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/sermons",               icon: "subscriptions", label: "All Sermons"    },
];

export default function SermonsDrawer() {
  const pathname = usePathname();

  return (
    <aside className="group fixed left-0 top-0 z-40 flex h-full w-14 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0a0a0a] transition-all duration-200 hover:w-48">
      {/* Content starts below the fixed header pill (~76px) */}
      <div className="flex flex-col gap-0.5 px-2 pt-20">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <span className={`material-symbols-rounded shrink-0 text-xl ${active ? "text-destiny-orange" : ""}`}>
                {item.icon}
              </span>
              <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 delay-75 group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
