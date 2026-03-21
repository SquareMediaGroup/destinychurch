"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/sermons", icon: "subscriptions", label: "Sermons" },
  { href: "/give", icon: "volunteer_activism", label: "Give" },
  { href: "/new-here", icon: "explore", label: "New Here" },
  { href: "/connect-card", icon: "contact_mail", label: "Connect" },
];

export default function SermonsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[64px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0a0a] lg:flex lg:w-[200px]">
      {/* inner scrollable area with top-pad for fixed header */}
      <div className="flex h-full flex-col px-2 pt-[80px] pb-4 overflow-y-auto">
        {/* Logo — visible only on wide sidebar */}
        <Link href="/" className="mb-6 hidden items-center px-2 lg:flex">
          <div className="relative h-5 w-[110px]">
            <Image
              src="/img/brand/destiny-logo-color-white.svg"
              alt="Destiny Church"
              fill
              sizes="110px"
              className="object-contain"
            />
          </div>
        </Link>

        {/* Back to site — icon only on narrow, with label on wide */}
        <Link
          href="/"
          className="mb-4 flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-white/30 transition hover:bg-white/5 hover:text-white/60 lg:px-3"
        >
          <span className="material-symbols-rounded text-xl shrink-0">arrow_back</span>
          <span className="hidden lg:inline">Back to site</span>
        </Link>

        <div className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-widest text-white/20 lg:block">
          Media
        </div>

        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/sermons"
                ? pathname.startsWith("/sermons")
                : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium transition lg:px-3 ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                <span
                  className={`material-symbols-rounded text-xl shrink-0 ${
                    isActive ? "text-destiny-orange" : ""
                  }`}
                >
                  {item.icon}
                </span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
