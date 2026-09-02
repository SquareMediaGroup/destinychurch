// Minimal shell for the staff self-service portal.
//
// Deliberately NOT app/admin/layout.tsx — that shell pulls in AdminSidebar,
// AdminCommandProvider (⌘K) and the onboarding-tour provider, all shaped for
// the RBAC admin surface. A portal user is not an admin (see
// lib/staffPortalAuth.ts), so this is a plain header + content shell reusing
// only the visual primitives, not the admin nav machinery.

import Link from "next/link";

const NAV = [
  { href: "/portal", label: "Profile", icon: "person" },
  { href: "/portal/leave", label: "Leave", icon: "event_busy" },
  { href: "/portal/documents", label: "Documents", icon: "folder_open" },
  { href: "/portal/design", label: "Design", icon: "draw" },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-black tracking-tight text-destiny-grey">
              Staff Portal
            </span>
            <nav className="hidden gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-destiny-grey/60 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
                >
                  <span className="material-symbols-rounded text-lg">{item.icon}</span>
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
              <span className="material-symbols-rounded text-lg">logout</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-black/5 px-5 py-2 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-destiny-grey/60 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
            >
              <span className="material-symbols-rounded text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
