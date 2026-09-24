"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminTabBar from "@/components/admin/AdminTabBar";
import { AdminCommandProvider } from "@/components/admin/AdminCommandPalette";
import OnboardingProvider from "@/components/admin/onboarding/OnboardingProvider";
import { useAdminTheme } from "@/lib/adminTheme";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // `.dark` is applied only to this layout's own wrapper div below — never to
  // document.documentElement — so it can never outlive this component or leak
  // onto the public site via a stray class left on <html>. See lib/adminTheme.ts.
  const { themeClass } = useAdminTheme();
  // Studio editor and the standalone auth pages take over the
  // full viewport — no sidebar
  const isFullViewport =
    (pathname.startsWith("/admin/studio/") && pathname !== "/admin/studio") ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password";

  if (isFullViewport) {
    return <>{children}</>;
  }

  // AdminCommandProvider owns ⌘K, the "g"-prefixed jumps and the recents log,
  // so it has to sit above both the chrome and the page.
  //
  // OnboardingProvider sits inside it and outside the shell: the tours spotlight
  // the sidebar, the header and the mobile tab bar as well as the page, and a
  // super admin previewing another access level needs the navigation itself to
  // narrow.
  return (
    <AdminCommandProvider>
      <OnboardingProvider>
        <div
          className={`flex min-h-screen flex-col bg-[#f5f7fa] dark:bg-destiny-grey-900 md:flex-row ${themeClass}`}
        >
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminHeader />
            {/* pb-24: the mobile tab bar is fixed to the bottom of the viewport,
                so without this the last row of a long page sits underneath it. */}
            <main className="flex-1 overflow-auto pb-24 md:pb-0">{children}</main>
          </div>
          {/* Inside OnboardingProvider so a super admin previewing another
              access level gets the tabs narrowed too, exactly as the sidebar is. */}
          <AdminTabBar />
        </div>
      </OnboardingProvider>
    </AdminCommandProvider>
  );
}
