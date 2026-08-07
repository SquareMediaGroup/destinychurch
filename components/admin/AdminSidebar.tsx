"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminRole, RoleFlags } from "@/lib/adminRoles";
import { NO_ROLES } from "@/lib/adminRoles";

// null = visible to every authenticated admin, regardless of role.
const topNavItems: { href: string; icon: string; label: string; exact?: boolean; role: AdminRole | null }[] = [
  { href: "/admin", icon: "grid_view", label: "Dashboard", exact: true, role: null },
  { href: "/admin/posts", icon: "article", label: "Posts", role: "site_admin" },
  { href: "/admin/training", icon: "school", label: "Training", role: "training_admin" },
];

const announcementItems: { href: string; label: string; role: AdminRole }[] = [
  { href: "/admin/banner", label: "Banner", role: "super_admin" },
  { href: "/admin/popup", label: "Popup", role: "event_admin" },
  { href: "/admin/featured-event", label: "Featured Event", role: "event_admin" },
  { href: "/admin/event-popup", label: "Event Popup", role: "event_admin" },
  { href: "/admin/nfc", label: "NFC Page", role: "event_admin" },
];

const courseItems: { href: string; label: string; role: AdminRole }[] = [
  { href: "/admin/featured-course", label: "Featured Course", role: "event_admin" },
  { href: "/admin/bible-course", label: "The Bible Course", role: "event_admin" },
  { href: "/admin/alpha", label: "Alpha", role: "event_admin" },
  { href: "/admin/recovery", label: "Recovery", role: "event_admin" },
];

const storeItems: { href: string; label: string; role: AdminRole }[] = [
  { href: "/admin/store", label: "Products", role: "store_admin" },
  { href: "/admin/store/orders", label: "Orders", role: "store_admin" },
  { href: "/admin/store/hero", label: "Hero", role: "store_admin" },
];

const bottomNavItems: { href: string; icon: string; label: string; role: AdminRole }[] = [
  { href: "/admin/redirects", icon: "alt_route", label: "Redirects", role: "site_admin" },
  { href: "/admin/cache", icon: "refresh", label: "Clear Cache", role: "super_admin" },
  { href: "/admin/users", icon: "group", label: "Users", role: "super_admin" },
];

function canSee(roles: RoleFlags, role: AdminRole | null): boolean {
  if (roles.super_admin) return true;
  if (role === null) return true;
  return roles[role];
}

function useAdminRoles(): RoleFlags {
  const [roles, setRoles] = useState<RoleFlags>(NO_ROLES);
  useEffect(() => {
    fetch("/api/admin/me/roles")
      .then((r) => (r.ok ? r.json() : NO_ROLES))
      .then(setRoles)
      .catch(() => {});
  }, []);
  return roles;
}

function NavDropdown({
  label,
  icon,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  icon: string;
  items: { href: string; label: string }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const groupActive = items.some((i) => pathname.startsWith(i.href));
  const [open, setOpen] = useState(groupActive);

  if (items.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
          groupActive
            ? "bg-destiny-orange/10 text-destiny-orange"
            : "text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey"
        }`}
      >
        <span className={`material-symbols-rounded text-xl ${groupActive ? "text-destiny-orange" : ""}`}>
          {icon}
        </span>
        <span className="flex-1 text-left">{label}</span>
        <span className="material-symbols-rounded text-base opacity-50">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open && (
        <div className="ml-9 mt-0.5 flex flex-col gap-0.5">
          {items.map((item) => {
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
  );
}

function NavItems({
  pathname,
  roles,
  onNavigate,
}: {
  pathname: string;
  roles: RoleFlags;
  onNavigate?: () => void;
}) {
  return (
    <>
      {topNavItems.filter((item) => canSee(roles, item.role)).map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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

      <NavDropdown
        label="Announcements"
        icon="campaign"
        items={announcementItems.filter((item) => canSee(roles, item.role))}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      <NavDropdown
        label="Courses"
        icon="event"
        items={courseItems.filter((item) => canSee(roles, item.role))}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      <NavDropdown
        label="Store"
        icon="storefront"
        items={storeItems.filter((item) => canSee(roles, item.role))}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      {bottomNavItems.filter((item) => canSee(roles, item.role)).map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
    </>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const roles = useAdminRoles();

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-black/8 md:bg-white">
        <SidebarContents pathname={pathname} roles={roles} />
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
            <NavItems pathname={pathname} roles={roles} onNavigate={() => setMobileOpen(false)} />
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

function SidebarContents({ pathname, roles }: { pathname: string; roles: RoleFlags }) {
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
        <NavItems pathname={pathname} roles={roles} />
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
