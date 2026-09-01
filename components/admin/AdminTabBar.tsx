"use client";

// The mobile admin navigation.
//
// Below md the sidebar used to collapse into a hamburger drawer: two taps to
// reach anything, three for a page inside a dropdown group, and nothing on
// screen the rest of the time saying where you were. This is the shape phones
// actually use instead — a tab bar pinned to the bottom, always visible, one
// tap per section.
//
// A tab is a *group*, not a page. A super admin can see around thirty-five
// pages, which is a scroller nobody can aim at, but only about eleven groups;
// a store admin sees three. So the row scrolls when it has to and centres
// itself when it doesn't, and tapping a group opens a sheet listing its pages.
// Everything comes from tabsFor() over the same ADMIN_GROUPS registry the
// sidebar, breadcrumbs, dashboard and palette read, so it cannot drift.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { activeTabKey, isActive, tabsFor, type AdminTab } from "@/lib/adminNav";
import { useAdminSession } from "@/lib/useAdminSession";
import { Sheet } from "@/components/admin/Sheet";

/**
 * The active pill is a single element that exists in both the outgoing and the
 * incoming DOM of a route change, so naming it lets the View Transition API
 * morph it from one tab to the next rather than snapping. Only ever one tab is
 * active, so the name stays unique in the document — which the API requires.
 */
const PILL_TRANSITION_NAME = "admin-tab-pill";

export default function AdminTabBar() {
  const pathname = usePathname();
  const { roles } = useAdminSession();
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // The open sheet remembers which route it was opened from, so a navigation
  // closes it by derivation rather than by an effect firing a setState after
  // the fact. Every link inside it navigates, and so does the ⌘K palette.
  const [opened, setOpened] = useState<{ key: string; at: string } | null>(null);

  const tabs = tabsFor(roles);
  const activeKey = activeTabKey(tabs, pathname);
  const openTab =
    opened && opened.at === pathname
      ? (tabs.find((tab) => tab.key === opened.key) ?? null)
      : null;

  // Keep the current section in view. In a row of eleven tabs the active one is
  // routinely off-screen after a jump from the palette or a breadcrumb, and a
  // tab bar that doesn't show you where you are is just a row of buttons.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeKey) return;
    const active = scroller.querySelector<HTMLElement>('[data-tab-active="true"]');
    if (!active) return;
    active.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeKey, reduceMotion]);

  if (tabs.length === 0) return null;

  return (
    <>
      <div
        data-tour="tabbar"
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      >
        <div className="glass admin-tabbar rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <nav aria-label="Admin sections">
            {/* admin-tabbar-scroll carries `justify-content: safe center`, which
                centres a short row and left-aligns a long one — see globals.css
                for why it can't be a Tailwind utility. */}
            <div
              ref={scrollerRef}
              className="admin-tabbar-scroll flex gap-1 overflow-x-auto overscroll-x-contain px-2 py-1.5"
            >
              {tabs.map((tab) => (
                <TabButton
                  key={tab.key}
                  tab={tab}
                  active={tab.key === activeKey}
                  reduceMotion={Boolean(reduceMotion)}
                  onOpenGroup={() => setOpened({ key: tab.key, at: pathname })}
                />
              ))}
            </div>
          </nav>
        </div>
      </div>

      {openTab && (
        <Sheet
          title={openTab.label}
          detent="auto"
          onClose={() => setOpened(null)}
        >
          <ul className="flex flex-col p-2">
            {openTab.items.map((item) => {
              const current = isActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpened(null)}
                    aria-current={current ? "page" : undefined}
                    className={`flex items-start gap-3 rounded-2xl px-3 py-3 transition ${
                      current
                        ? "bg-destiny-orange/10 text-destiny-orange"
                        : "text-destiny-grey hover:bg-[#f5f7fa] dark:text-white dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="material-symbols-rounded mt-0.5 text-xl">
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{item.label}</span>
                      <span
                        className={`block text-xs ${
                          current
                            ? "text-destiny-orange/70"
                            : "text-destiny-grey/45 dark:text-white/45"
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}
    </>
  );
}

function TabButton({
  tab,
  active,
  reduceMotion,
  onOpenGroup,
}: {
  tab: AdminTab;
  active: boolean;
  reduceMotion: boolean;
  onOpenGroup: () => void;
}) {
  // min-w-16/min-h-11: a 64×44 target, the smallest thing a thumb reliably hits.
  const className = `relative flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 text-center transition ${
    active ? "text-destiny-orange" : "text-destiny-grey/55 dark:text-white/55"
  }`;

  const content = (
    <>
      {active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-destiny-orange/12"
          // Under reduced motion the pill is left unnamed, so it simply appears
          // on the new tab instead of sliding across the bar.
          style={
            reduceMotion ? undefined : { viewTransitionName: PILL_TRANSITION_NAME }
          }
        />
      )}
      <span className="material-symbols-rounded relative z-10 text-[22px] leading-none">
        {tab.icon}
      </span>
      <span className="relative z-10 max-w-16 truncate text-[10px] font-bold leading-tight">
        {tab.label}
      </span>
    </>
  );

  if (tab.href) {
    return (
      <Link
        href={tab.href}
        data-tab-active={active}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenGroup}
      data-tab-active={active}
      aria-haspopup="dialog"
      className={className}
    >
      {content}
    </button>
  );
}
