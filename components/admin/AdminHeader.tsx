"use client";

// The desktop admin header: where you are, and the search box.
//
// It used to render a single flattened title from a hand-maintained map, so a
// product editor said only "Admin › Store" with no way back up to Products. The
// trail now comes from lib/adminNav (one registry, shared with the sidebar,
// dashboard and palette) and every level above the current page is a link.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbsFor } from "@/lib/adminNav";
import { CommandTrigger, useAdminCommand } from "@/components/admin/AdminCommandPalette";

export default function AdminHeader() {
  const pathname = usePathname();
  const crumbs = breadcrumbsFor(pathname);
  const { openShortcuts } = useAdminCommand();

  return (
    <header className="sticky top-0 z-20 hidden h-16 items-center justify-between gap-4 border-b border-black/8 bg-white/90 px-8 backdrop-blur md:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-2">
              {i > 0 && (
                <span
                  aria-hidden
                  className="material-symbols-rounded text-base text-destiny-grey/25"
                >
                  chevron_right
                </span>
              )}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="truncate font-bold text-destiny-grey/40 transition hover:text-destiny-grey"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="truncate font-black text-destiny-grey"
                >
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <CommandTrigger />
        <button
          type="button"
          onClick={openShortcuts}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-destiny-grey/45 transition hover:text-destiny-grey"
        >
          <span className="material-symbols-rounded text-lg">keyboard</span>
        </button>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-xl bg-destiny-grey px-3.5 py-2 text-sm font-bold text-white transition hover:bg-destiny-grey/90"
        >
          <span className="material-symbols-rounded text-lg">open_in_new</span>
          View live site
        </Link>
      </div>
    </header>
  );
}
