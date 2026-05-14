"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  // Builder edit screen takes over the full viewport
  const isBuilderEditor =
    pathname.startsWith("/admin/builder/") && pathname !== "/admin/builder";

  if (isLogin || isBuilderEditor) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fa] md:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
