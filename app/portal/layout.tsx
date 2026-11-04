// Minimal shell for the staff self-service portal.
//
// Deliberately NOT app/admin/layout.tsx — that shell pulls in AdminSidebar,
// AdminCommandProvider (⌘K) and the onboarding-tour provider, all shaped for
// the RBAC admin surface. A portal user is not an admin (see
// lib/staffPortalAuth.ts), so this is a plain header + content shell reusing
// only the visual primitives, not the admin nav machinery.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PORTAL_OPEN, PORTAL_REOPENS } from "@/lib/portalStatus";

const NAV = [
  { href: "/portal", label: "Home", icon: "home", exact: true },
  { href: "/portal/profile", label: "Profile", icon: "person" },
  { href: "/portal/team", label: "Team", icon: "groups" },
  { href: "/portal/reviews", label: "Reviews", icon: "fact_check" },
  { href: "/portal/leave", label: "Leave", icon: "event_busy" },
  { href: "/portal/documents", label: "Documents", icon: "folder_open" },
  { href: "/portal/design", label: "Design", icon: "draw" },
];

function isActive(pathname: string, item: (typeof NAV)[number]): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** Shown in place of every portal page while lib/portalStatus.ts has it closed. */
function PortalClosed() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-destiny-grey px-4 py-16">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/img/photos/Hero%20BKG.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/65 to-destiny-grey/90" />
      <div className="glass relative z-10 w-full max-w-md rounded-3xl p-8 text-center">
        <span className="mb-4 inline-block rounded-full bg-destiny-orange/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-destiny-orange">
          Coming {PORTAL_REOPENS}
        </span>
        <h1 className="text-2xl font-black text-white">The Staff Portal is closed for now</h1>
        <p className="mt-3 text-sm leading-relaxed text-on-dark-subtle">
          Profiles, leave, reviews, documents and design requests will be back here in{" "}
          {PORTAL_REOPENS}. Until then, speak to your manager or the office.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15"
        >
          Back to the website
        </Link>
      </div>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (!PORTAL_OPEN) return <PortalClosed />;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-black tracking-tight text-destiny-grey">
              Staff Portal
            </span>
            <nav className="hidden gap-1 lg:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-[#f5f7fa] hover:text-destiny-grey ${
                    isActive(pathname, item) ? "text-destiny-orange" : "text-destiny-grey/60"
                  }`}
                >
                  <span className="material-symbols-rounded text-lg" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
            >
              <span className="material-symbols-rounded text-lg" aria-hidden="true">logout</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-black/5 px-5 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition hover:bg-[#f5f7fa] hover:text-destiny-grey ${
                isActive(pathname, item) ? "text-destiny-orange" : "text-destiny-grey/60"
              }`}
            >
              <span className="material-symbols-rounded text-base" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
