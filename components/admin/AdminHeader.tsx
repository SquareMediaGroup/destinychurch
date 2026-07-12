"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Prettify a route segment that isn't in the explicit title map.
function prettify(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Explicit titles for the sections whose slug doesn't read nicely on its own.
const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/posts": "Posts",
  "/admin/training": "Training",
  "/admin/banner": "Banner",
  "/admin/popup": "Popup",
  "/admin/alpha": "Alpha",
  "/admin/recovery": "Recovery",
  "/admin/store": "Products",
  "/admin/store/orders": "Orders",
  "/admin/store/hero": "Store Hero",
  "/admin/redirects": "Redirects",
  "/admin/cache": "Clear Cache",
  "/admin/hr": "HR",
};

function titleFor(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  // Longest matching prefix wins (e.g. /admin/store/products/123 → Store).
  const match = Object.keys(TITLES)
    .filter((key) => pathname.startsWith(key) && key !== "/admin")
    .sort((a, b) => b.length - a.length)[0];
  if (match) return TITLES[match];
  const last = pathname.split("/").filter(Boolean).pop();
  return last ? prettify(last) : "Dashboard";
}

export default function AdminHeader() {
  const pathname = usePathname();
  const title = titleFor(pathname);
  const isDashboard = pathname === "/admin";

  return (
    <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-black/8 bg-white/90 px-8 backdrop-blur md:flex">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-bold uppercase tracking-widest text-destiny-grey/30">
          Admin
        </span>
        {!isDashboard && (
          <>
            <span className="material-symbols-rounded text-base text-destiny-grey/25">
              chevron_right
            </span>
            <span className="font-black text-destiny-grey">{title}</span>
          </>
        )}
        {isDashboard && (
          <span className="font-black text-destiny-grey">Dashboard</span>
        )}
      </div>

      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-2 rounded-xl bg-destiny-grey px-3.5 py-2 text-sm font-bold text-white transition hover:bg-destiny-grey/90"
      >
        <span className="material-symbols-rounded text-lg">open_in_new</span>
        View live site
      </Link>
    </header>
  );
}
