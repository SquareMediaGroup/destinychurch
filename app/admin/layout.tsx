"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Studio editor and the standalone auth pages take over the
  // full viewport — no sidebar
  const isFullViewport =
    (pathname.startsWith("/admin/studio/") && pathname !== "/admin/studio") ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password";

  if (isFullViewport) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fa] md:flex-row">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
