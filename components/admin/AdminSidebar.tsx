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
import { motion, useReducedMotion } from "motion/react";
import type { AdminNavGroup, AdminNavItem } from "@/lib/adminNav";
import { visibleGroups } from "@/lib/adminNav";
import { useAdminSession } from "@/lib/useAdminSession";
import { CommandTrigger, CommandTriggerIcon } from "@/components/admin/AdminCommandPalette";
import { AdminThemeToggle } from "@/components/admin/AdminThemeToggle";

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
  `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
    active
      ? "text-destiny-orange"
      : "text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
  }`;

function NavLink({
  item,
  pathname,
  onNavigate,
  scope,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate?: () => void;
  /**
   * Which nav instance this is ("desktop" or "mobile") — the desktop
   * `<aside>` and the mobile drawer both render the same NavLink component,
   * and the sliding highlight below tracks its position by `layoutId`, so two
   * separate instances need two separate ids or the highlight could try to
   * animate between them instead of just fading in on each independently.
   */
  scope: string;
}) {
  const active = isActive(item, pathname);
  const reduceMotion = useReducedMotion();

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={linkClass(active)}
    >
      {active &&
        (reduceMotion ? (
          <span className="absolute inset-0 rounded-xl bg-destiny-orange/10" aria-hidden />
        ) : (
          // The active pill slides between nav items on navigation rather than
          // snapping — the one place in the sidebar that had zero motion at all.
          <motion.span
            layoutId={`admin-nav-active-${scope}`}
            className="absolute inset-0 rounded-xl bg-destiny-orange/10"
            transition={{ duration: 0.22, ease: "easeOut" }}
            aria-hidden
          />
        ))}
      <span
        className={`material-symbols-rounded relative z-10 text-xl ${active ? "text-destiny-orange" : ""}`}
      >
        {item.icon}
      </span>
      <span className="relative z-10">{item.label}</span>
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
            : "text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
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
                    : "text-destiny-grey/50 hover:text-destiny-grey dark:text-white/50 dark:hover:text-white"
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
  scope,
}: {
  groups: AdminNavGroup[];
  pathname: string;
  onNavigate?: () => void;
  openGroups: Record<string, boolean>;
  onToggle: (label: string) => void;
  scope: string;
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
              scope={scope}
            />
          ))
        ) : group.items.length === 1 ? (
          // A group of one is a link, not a dropdown to open for a single child.
          <NavLink
            key={group.items[0].href}
            item={group.items[0]}
            pathname={pathname}
            onNavigate={onNavigate}
            scope={scope}
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
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-black/8 md:bg-white dark:md:border-white/8 dark:md:bg-destiny-grey-800">
        <SidebarContents
          groups={groups}
          pathname={pathname}
          email={email}
          openGroups={openGroups}
          onToggle={toggleGroup}
        />
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/8 bg-white px-4 py-3 dark:border-white/8 dark:bg-destiny-grey-800 md:hidden">
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
          <AdminThemeToggle />
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f7fa] text-destiny-grey dark:bg-white/5 dark:text-white"
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
        <div className="border-b border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800 md:hidden">
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
              scope="mobile"
            />
            <div className="mt-2 flex flex-col gap-1 border-t border-black/5 pt-2 dark:border-white/8">
              {email && (
                <p className="truncate px-3 py-1 text-xs font-bold text-destiny-grey/35 dark:text-white/35">
                  {email}
                </p>
              )}
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <span className="material-symbols-rounded text-xl">open_in_new</span>
                View site
              </Link>
              <form action="/api/admin/logout" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
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
      <nav
        aria-label="Admin sections"
        data-tour="sidebar"
        className="flex flex-col gap-1 overflow-y-auto px-3"
      >
        <NavItems
          groups={groups}
          pathname={pathname}
          openGroups={openGroups}
          onToggle={onToggle}
          scope="desktop"
        />
      </nav>

      {/* Bottom — who you are, view site, sign out */}
      <div className="mt-auto flex flex-col gap-1 border-t border-black/5 px-3 py-4 dark:border-white/8">
        {email && (
          <p
            className="truncate px-3 pb-1 text-[11px] font-bold text-destiny-grey/35 dark:text-white/35"
            title={email}
          >
            {email}
          </p>
        )}
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <span className="material-symbols-rounded text-xl">open_in_new</span>
          View site
        </Link>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <span className="material-symbols-rounded text-xl">logout</span>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
