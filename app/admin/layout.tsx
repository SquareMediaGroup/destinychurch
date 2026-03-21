"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/admin", icon: "dashboard", label: "Dashboard", exact: true },
  { href: "/admin/redirects", icon: "link", label: "Redirects" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      {/* Sidebar */}
      <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-black/5 bg-[#0a0a0a] sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.07]">
          <div className="relative h-8 w-8 shrink-0">
            <Image
              src="/img/brand/Destiny%20SVG%20Logos/Destiny%20Logo%20Icons%20SVG/Icon_No_Background.svg"
              alt="Destiny Church"
              fill
              className="object-contain"
            />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-white leading-tight">Destiny</p>
            <p className="text-[10px] text-white/40 leading-tight">Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                <span className={`material-symbols-rounded text-xl ${isActive ? "text-destiny-orange" : ""}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.07]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 transition hover:bg-white/5 hover:text-white/70"
          >
            <span className="material-symbols-rounded text-xl">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-8">
        {children}
      </main>
    </div>
  );
}
