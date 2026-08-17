"use client";

// The admin sidebar. Everything it shows comes from lib/adminNav — it used to
// carry its own copy of the navigation, which drifted from the dashboard's.
//
// Two behaviour fixes over the previous version:
//   • the mobile drawer scrolls and closes on Escape (it could previously grow
//     taller than the viewport with no way to reach Sign out)
//   • dropdown groups remember whether you left them open, per browser, so the
//     Store group isn't collapsed again every time you land on a Store page
//     from somewhere else

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { AdminNavGroup, AdminNavItem } from "@/lib/adminNav";
import { visibleGroups } from "@/lib/adminNav";
import { useAdminSession } from "@/lib/useAdminSession";
import { CommandTrigger, CommandTriggerIcon } from "@/components/admin/AdminCommandPalette";

/* ── Remembered dropdown state ─────────────────────────────────────────────
 * Which groups are expanded lives in localStorage, modelled as an external
 * store rather than component state: useSyncExternalStore gives the server an
 * explicit empty snapshot (no hydration mismatch on the expanded groups) and
 * keeps the desktop sidebar and the mobile drawer in step without lifting
 * state between them.
 *
 * getSnapshot has to return a stable reference or React re-renders forever,
 * hence the cache — it's only invalidated when we write.
 */

const OPEN_GROUPS_KEY = "dc-admin-open-groups";
const OPEN_GROUPS_EVENT = "dc-admin-open-groups-change";

type OpenGroups = Record<string, boolean>;

const EMPTY_GROUPS: OpenGroups = {};
let groupsCache: OpenGroups | null = null;

function readOpenGroups(): OpenGroups {
  if (groupsCache) return groupsCache;
  try {
    const raw = window.localStorage.getItem(OPEN_GROUPS_KEY);
    groupsCache = raw ? (JSON.parse(raw) as OpenGroups) : EMPTY_GROUPS;
  } catch {
    groupsCache = EMPTY_GROUPS;
  }
  return groupsCache;
}

function readOpenGroupsServer(): OpenGroups {
  return EMPTY_GROUPS;
}

function subscribeToOpenGroups(onChange: () => void): () => void {
  window.addEventListener(OPEN_GROUPS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(OPEN_GROUPS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeOpenGroups(next: OpenGroups) {
  groupsCache = next;
  try {
    window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
  } catch {
    // Private browsing — the sidebar just won't remember across reloads.
  }
  window.dispatchEvent(new Event(OPEN_GROUPS_EVENT));
}

function isActive(item: AdminNavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  // Prefix match must stop at a segment boundary, or /admin/store would light
  // up for /admin/store-something and Products would light up for Orders.
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const linkClass = (active: boolean) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
    active
      ? "bg-destiny-orange/10 text-destiny-orange"
      : "text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey"
  }`;

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(item, pathname);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={linkClass(active)}
    >
      <span
        className={`material-symbols-rounded text-xl ${active ? "text-destiny-orange" : ""}`}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function NavDropdown({
  group,
  pathname,
  onNavigate,
  openGroups,
  onToggle,
}: {
  group: AdminNavGroup;
  pathname: string;
  onNavigate?: () => void;
  openGroups: Record<string, boolean>;
  onToggle: (label: string) => void;
}) {
  const label = group.label!;
  const groupActive = group.items.some((i) => isActive(i, pathname));
  // Being inside the group always wins; otherwise honour the remembered state.
  const open = groupActive || (openGroups[label] ?? false);

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(label)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
          groupActive
            ? "bg-destiny-orange/10 text-destiny-orange"
            : "text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey"
        }`}
      >
        <span
          className={`material-symbols-rounded text-xl ${groupActive ? "text-destiny-orange" : ""}`}
        >
          {group.icon}
        </span>
        <span className="flex-1 text-left">{label}</span>
        <span className="material-symbols-rounded text-base opacity-50">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open && (
        <div className="ml-9 mt-0.5 flex flex-col gap-0.5">
          {group.items.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
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
  groups,
  pathname,
  onNavigate,
  openGroups,
  onToggle,
}: {
  groups: AdminNavGroup[];
  pathname: string;
  onNavigate?: () => void;
  openGroups: Record<string, boolean>;
  onToggle: (label: string) => void;
}) {
  return (
    <>
      {groups.map((group) =>
        group.label === null ? (
          group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))
        ) : group.items.length === 1 ? (
          // A group of one is a link, not a dropdown to open for a single child.
          <NavLink
            key={group.items[0].href}
            item={group.items[0]}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ) : (
          <NavDropdown
            key={group.label}
            group={group}
            pathname={pathname}
            onNavigate={onNavigate}
            openGroups={openGroups}
            onToggle={onToggle}
          />
        ),
      )}
    </>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { roles, email } = useAdminSession();
  const openGroups = useSyncExternalStore(
    subscribeToOpenGroups,
    readOpenGroups,
    readOpenGroupsServer,
  );

  const toggleGroup = useCallback((label: string) => {
    const current = readOpenGroups();
    writeOpenGroups({ ...current, [label]: !current[label] });
  }, []);

  // Escape closes the drawer. Every link inside it already closes it via
  // onNavigate, so there's no need to watch the pathname as well.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const groups = visibleGroups(roles);

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-black/8 md:bg-white">
        <SidebarContents
          groups={groups}
          pathname={pathname}
          email={email}
          openGroups={openGroups}
          onToggle={toggleGroup}
        />
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/8 bg-white px-4 py-3 md:hidden">
        <Link href="/admin" className="relative h-7 w-[130px]">
          <Image
            src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo Colour.svg"
            alt="Destiny Church Admin"
            fill
            sizes="130px"
            className="object-contain object-left"
          />
        </Link>
        <div className="flex items-center gap-2">
          <CommandTriggerIcon />
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f7fa] text-destiny-grey"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <span className="material-symbols-rounded text-xl">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="border-b border-black/8 bg-white md:hidden">
          <nav
            aria-label="Admin sections"
            className="flex max-h-[calc(100vh-8rem)] flex-col gap-1 overflow-y-auto p-3"
          >
            <NavItems
              groups={groups}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              openGroups={openGroups}
              onToggle={toggleGroup}
            />
            <div className="mt-2 flex flex-col gap-1 border-t border-black/5 pt-2">
              {email && (
                <p className="truncate px-3 py-1 text-xs font-bold text-destiny-grey/35">
                  {email}
                </p>
              )}
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
          </nav>
        </div>
      )}
    </>
  );
}

function SidebarContents({
  groups,
  pathname,
  email,
  openGroups,
  onToggle,
}: {
  groups: AdminNavGroup[];
  pathname: string;
  email: string | null;
  openGroups: Record<string, boolean>;
  onToggle: (label: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center px-5 py-5">
        <Link href="/admin" className="relative h-7 w-[140px]">
          <Image
            src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo Colour.svg"
            alt="Destiny Church Admin"
            fill
            sizes="140px"
            className="object-contain object-left"
          />
        </Link>
      </div>

      {/* Search — the sidebar is where people look for it first */}
      <div className="mb-4 px-3">
        <CommandTrigger className="w-full justify-start" />
      </div>

      {/* Nav */}
      <nav aria-label="Admin sections" className="flex flex-col gap-1 overflow-y-auto px-3">
        <NavItems
          groups={groups}
          pathname={pathname}
          openGroups={openGroups}
          onToggle={onToggle}
        />
      </nav>

      {/* Bottom — who you are, view site, sign out */}
      <div className="mt-auto flex flex-col gap-1 border-t border-black/5 px-3 py-4">
        {email && (
          <p
            className="truncate px-3 pb-1 text-[11px] font-bold text-destiny-grey/35"
            title={email}
          >
            {email}
          </p>
        )}
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
