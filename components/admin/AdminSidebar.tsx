"use client";

// The admin sidebar. Everything it shows comes from lib/adminNav — it used to
// carry its own copy of the navigation, which drifted from the dashboard's.
//
// Dropdown groups remember whether you left them open, per browser, so the
// Store group isn't collapsed again every time you land on a Store page from
// somewhere else.
//
// Below md this renders only a slim top bar: the logo, where you are, search,
// the theme toggle and an account button. Navigation itself lives in
// AdminTabBar, which replaced the hamburger drawer this file used to carry.
// The account sheet is what keeps "View site" and Sign out reachable on a
// phone now that the drawer's footer is gone.

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AdminNavGroup, AdminNavItem } from "@/lib/adminNav";
import { breadcrumbsFor, isActive, visibleGroups } from "@/lib/adminNav";
import { useAdminSession } from "@/lib/useAdminSession";
import { CommandTrigger, CommandTriggerIcon } from "@/components/admin/AdminCommandPalette";
import { AdminThemeToggle } from "@/components/admin/AdminThemeToggle";
import { Sheet } from "@/components/admin/Sheet";

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
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate?: () => void;
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
            layoutId="admin-nav-active"
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
  const [accountOpen, setAccountOpen] = useState(false);
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

  const groups = visibleGroups(roles);
  // The mobile bar has no breadcrumbs to hide behind a menu the way the desktop
  // header does, and below md there was previously nothing on screen saying
  // where you were at all. The last crumb is the page; the ones before it are
  // the way back out.
  const crumbs = breadcrumbsFor(pathname);

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
      {/* Navigation itself is AdminTabBar, pinned to the bottom of the screen —
          this bar is identity, place and the two things that have nowhere else
          to live on a phone. */}
      <div className="sticky top-0 z-30 flex flex-col gap-1.5 border-b border-black/8 bg-white px-4 py-3 dark:border-white/8 dark:bg-destiny-grey-800 md:hidden">
        <div className="flex items-center justify-between">
          {/* -ml-[15px]: the logo SVG has ~15px of transparent padding baked in
              before the mark starts, so object-left alone still left the
              wordmark sitting visibly right of the breadcrumb text below it. */}
          <Link href="/admin" className="relative -ml-[15px] h-7 w-[130px]">
            <Image
              src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo Colour.svg"
              alt="Destiny Church Admin"
              fill
              sizes="130px"
              className="object-contain object-left dark:hidden"
            />
            <Image
              src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo White.svg"
              alt="Destiny Church Admin"
              fill
              sizes="130px"
              className="hidden object-contain object-left dark:block"
            />
          </Link>
          <div className="flex items-center gap-2">
            <CommandTriggerIcon />
            <AdminThemeToggle />
            <button
              onClick={() => setAccountOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f7fa] text-destiny-grey dark:bg-white/5 dark:text-white"
              aria-label="Account"
              aria-haspopup="dialog"
            >
              <span className="material-symbols-rounded text-xl">account_circle</span>
            </button>
          </div>
        </div>

        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xs">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="material-symbols-rounded text-sm text-destiny-grey/25 dark:text-white/25"
                    >
                      chevron_right
                    </span>
                  )}
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className="truncate font-bold text-destiny-grey/40 dark:text-white/40"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate font-bold text-destiny-grey dark:text-white">
                      {crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        )}
      </div>

      {/* ── Mobile account sheet ──────────────────────────────────────────
          Who you are, and the two actions that used to sit at the foot of the
          hamburger drawer. Sign out has to keep a home on mobile. */}
      {accountOpen && (
        <Sheet
          title="Account"
          subtitle={email ?? undefined}
          detent="auto"
          onClose={() => setAccountOpen(false)}
        >
          <div className="flex flex-col p-2">
            <Link
              href="/"
              target="_blank"
              onClick={() => setAccountOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-destiny-grey transition hover:bg-[#f5f7fa] dark:text-white dark:hover:bg-white/5"
            >
              <span className="material-symbols-rounded text-xl">open_in_new</span>
              View site
            </Link>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-destiny-grey transition hover:bg-[#f5f7fa] dark:text-white dark:hover:bg-white/5"
              >
                <span className="material-symbols-rounded text-xl">logout</span>
                Sign out
              </button>
            </form>
          </div>
        </Sheet>
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
            className="object-contain object-left dark:hidden"
          />
          <Image
            src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo White.svg"
            alt="Destiny Church Admin"
            fill
            sizes="140px"
            className="hidden object-contain object-left dark:block"
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
