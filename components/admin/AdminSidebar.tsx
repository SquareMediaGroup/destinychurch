"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/admin/sermons", icon: "play_circle", label: "Sermons" },
  { href: "/admin/banner", icon: "campaign", label: "Banner" },
  { href: "/admin/alpha", icon: "event", label: "Alpha" },
  { href: "/admin/recovery", icon: "healing", label: "Recovery" },
  { href: "/admin/pages", icon: "article", label: "Pages" },
  { href: "/admin/redirects", icon: "alt_route", label: "Redirects" },
  { href: "/admin/cache", icon: "refresh", label: "Clear Cache" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-black/8 md:bg-white">
        <SidebarContents pathname={pathname} />
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-black/8 bg-white px-4 py-3 md:hidden">
        <div className="relative h-7 w-[130px]">
          <Image
            src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo Colour.svg"
            alt="Destiny Church Admin"
            fill
            sizes="130px"
            className="object-contain object-left"
          />
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f7fa] text-destiny-grey"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-rounded text-xl">
            {mobileOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="border-b border-black/8 bg-white md:hidden">
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-destiny-orange/10 text-destiny-orange"
                      : "text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey"
                  }`}
                >
                  <span className="material-symbols-rounded text-xl">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 border-t border-black/5 pt-2">
              <form action="/api/admin/logout" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
                >
                  <span className="material-symbols-rounded text-xl">logout</span>
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function SidebarContents({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center px-5 py-5">
        <div className="relative h-7 w-[140px]">
          <Image
            src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo Colour.svg"
            alt="Destiny Church Admin"
            fill
            sizes="140px"
            className="object-contain object-left"
          />
        </div>
      </div>

      <div className="mx-4 mb-4 rounded-lg bg-[#f5f7fa] px-3 py-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-destiny-grey/40">Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                active
                  ? "bg-destiny-orange/10 text-destiny-orange"
                  : "text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey"
              }`}
            >
              <span className={`material-symbols-rounded text-xl ${active ? "text-destiny-orange" : ""}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — view site + sign out */}
      <div className="mt-auto border-t border-black/5 px-3 py-4 flex flex-col gap-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
        >
          <span className="material-symbols-rounded text-xl">open_in_new</span>
          View site
        </Link>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
          >
            <span className="material-symbols-rounded text-xl">logout</span>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
