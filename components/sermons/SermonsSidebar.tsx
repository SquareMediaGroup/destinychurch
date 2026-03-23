"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ICON_SRC =
  "/img/brand/destiny-icon.svg";

const whatsOnItems = [
  { href: "/whats-on", label: "Events" },
  { href: "/whats-on", label: "Courses" },
  { href: "/alpha", label: "Alpha" },
  { href: "/missions", label: "Missions" },
  { href: "/whats-on", label: "Highlights" },
];

const aboutItems = [
  { href: "/about", label: "Our Mission" },
  { href: "/about#pillars", label: "Foundational Pillars" },
  { href: "/about#team", label: "Meet the Team" },
  { href: "/beliefs", label: "What We Believe" },
  { href: "/visit", label: "Plan a Visit" },
];

const topItems = [
  { href: "/sermons", icon: "subscriptions", label: "Sermons" },
  { href: "/series", icon: "video_library", label: "Series" },
  { href: "/guest-speakers", icon: "mic", label: "Guest Speakers" },
];

const bottomItems = [
  { href: "/whats-on", icon: "event", label: "What's On", sub: whatsOnItems },
  { href: "/serve", icon: "handshake", label: "Serve" },
  { href: "/about", icon: "info", label: "About", sub: aboutItems },
  { href: "/give", icon: "volunteer_activism", label: "Give" },
  { href: "/new-here", icon: "explore", label: "New Here?" },
];

function ExpandableItem({
  item,
  isActive,
}: {
  item: (typeof bottomItems)[number];
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* row: link + chevron toggle */}
      <div className="flex items-center">
        <Link
          href={item.href}
          className={`flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            isActive
              ? "bg-white/10 text-white"
              : "text-white/50 hover:bg-white/5 hover:text-white/80"
          }`}
        >
          <span
            className={`material-symbols-rounded shrink-0 text-xl ${
              isActive ? "text-destiny-orange" : ""
            }`}
          >
            {item.icon}
          </span>
          <span className="hidden lg:inline">{item.label}</span>
        </Link>
        {/* chevron — only visible on wide sidebar */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="hidden shrink-0 rounded-lg p-1.5 text-white/30 transition hover:text-white/70 lg:block"
          aria-label={`Toggle ${item.label}`}
        >
          <svg
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* sub-items — wide sidebar only */}
      {open && (
        <div className="hidden lg:block ml-9 mt-0.5 flex flex-col gap-0.5">
          {item.sub!.map((sub) => (
            <Link
              key={sub.label}
              href={sub.href}
              className="block rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition hover:bg-white/5 hover:text-white/80"
            >
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SermonsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-14 shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0a0a] lg:w-[220px]">
      <div className="flex h-full flex-col overflow-y-auto px-2 pb-4 pt-5">
        {/* Logo */}
        <Link
          href="/"
          className="mb-6 flex items-center gap-3 px-1"
          title="Destiny Church"
        >
          <div className="relative h-10 w-10 shrink-0">
            <Image
              src={ICON_SRC}
              alt="Destiny Church"
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
        </Link>

        {/* Nav — top group */}
        <nav className="flex flex-col gap-0.5">
          {topItems.map((item) => {
            const isActive =
              item.href === "/sermons"
                ? pathname.startsWith("/sermons")
                : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <span
                  className={`material-symbols-rounded shrink-0 text-xl ${
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

        {/* Separator */}
        <div className="mx-2 my-2 border-t border-white/[0.07]" />

        {/* Nav — bottom group */}
        <nav className="flex flex-col gap-0.5">
          {bottomItems.map((item) => {
            const isActive = pathname.startsWith(item.href);

            if (item.sub) {
              return (
                <ExpandableItem key={item.href} item={item} isActive={isActive} />
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <span
                  className={`material-symbols-rounded shrink-0 text-xl ${
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

        {/* Spacer */}
        <div className="flex-1" />
      </div>
    </aside>
  );
}
