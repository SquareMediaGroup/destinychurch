"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/redirects", label: "Redirects" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          {/* Logo + label */}
          <Link href="/admin" className="flex items-center gap-2.5 shrink-0">
            <div className="relative h-7 w-7">
              <Image
                src="/img/brand/destiny-icon.svg"
                alt="Destiny Church"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-sm font-black uppercase tracking-wide text-destiny-grey">
              Admin
            </span>
          </Link>

          {/* Divider */}
          <div className="h-5 w-px bg-black/10" />

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-destiny-orange text-white"
                      : "text-destiny-grey/60 hover:bg-black/5 hover:text-destiny-grey"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-grey"
          >
            <span className="material-symbols-rounded text-base">logout</span>
            Sign out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
