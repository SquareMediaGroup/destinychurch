"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/redirects", label: "Redirects" },
  { href: "/admin/sermons", label: "Sermons" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
              const isActive = pathname.startsWith(item.href);
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
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
