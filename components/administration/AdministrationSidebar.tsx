"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const hrItems = [
  { href: "/administration/hr/staff", label: "Staff" },
  { href: "/administration/hr/leave", label: "Leave" },
  { href: "/administration/hr/documents", label: "Documents" },
  { href: "/administration/hr/reviews", label: "Reviews" },
  { href: "/administration/hr/jobs", label: "Jobs & internships" },
  { href: "/administration/hr/applications", label: "Applications" },
];

function NavLink({
  href,
  icon,
  label,
  pathname,
  onNavigate,
  exact,
}: {
  href: string;
  icon: string;
  label: string;
  pathname: string;
  onNavigate?: () => void;
  exact?: boolean;
}) {
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
        active
          ? "bg-destiny-orange/10 text-destiny-orange"
          : "text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey"
      }`}
    >
      <span
        className={`material-symbols-rounded text-xl ${active ? "text-destiny-orange" : ""}`}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

function NavItems({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const hrActive = pathname.startsWith("/administration/hr");
  const [open, setOpen] = useState(hrActive);

  return (
    <>
      <NavLink
        href="/administration"
        icon="grid_view"
        label="Overview"
        pathname={pathname}
        onNavigate={onNavigate}
        exact
      />

      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
            hrActive
              ? "bg-destiny-orange/10 text-destiny-orange"
              : "text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey"
          }`}
        >
          <span
            className={`material-symbols-rounded text-xl ${hrActive ? "text-destiny-orange" : ""}`}
          >
            badge
          </span>
          <span className="flex-1 text-left">HR</span>
          <span className="material-symbols-rounded text-base opacity-50">
            {open ? "expand_less" : "expand_more"}
          </span>
        </button>
        {open && (
          <div className="ml-9 mt-0.5 flex flex-col gap-0.5">
            {hrItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    active
                      ? "text-destiny-orange"
                      : "text-destiny-grey/50 hover:text-destiny-grey"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdministrationSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-black/8 md:bg-white">
        <SidebarContents pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-black/8 bg-white px-4 py-3 md:hidden">
        <div className="relative h-7 w-[130px]">
          <Image
            src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo Colour.svg"
            alt="Destiny Church Administration"
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-b border-black/8 bg-white md:hidden">
          <nav className="flex flex-col gap-1 p-3">
            <NavItems pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <div className="mt-2 flex flex-col gap-1 border-t border-black/5 pt-2">
              <Link
                href="/admin-login"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
              >
                <span className="material-symbols-rounded text-xl">swap_horiz</span>
                Switch system
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
            alt="Destiny Church Administration"
            fill
            sizes="140px"
            className="object-contain object-left"
          />
        </div>
      </div>

      <div className="mx-4 mb-4 rounded-lg bg-[#f5f7fa] px-3 py-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-destiny-grey/40">
          Administration
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3">
        <NavItems pathname={pathname} />
      </nav>

      {/* Bottom — switch system + sign out */}
      <div className="mt-auto flex flex-col gap-1 border-t border-black/5 px-3 py-4">
        <Link
          href="/admin-login"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
        >
          <span className="material-symbols-rounded text-xl">swap_horiz</span>
          Switch system
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
