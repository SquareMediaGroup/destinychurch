import { createClient } from "@/utils/supabase/middleware";
import { getRoles, requiredRoleForPath } from "@/lib/roles";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, supabaseResponse } = createClient(request);

  const { data: { user } } = await supabase.auth.getUser();

  // Allow unauthenticated logout endpoint so sign-out always succeeds
  if (pathname === "/api/admin/logout") {
    return supabaseResponse;
  }

  // The old login page is gone — /admin-login is the single front door
  if (pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Public auth pages must stay reachable while logged out — these are exactly
  // the pages a user needs when they can't sign in.
  const PUBLIC_ADMIN_PATHS = ["/admin/forgot-password", "/admin/reset-password"];
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return supabaseResponse;
  }

  // Unauthenticated API requests: return 401 instead of redirecting
  if (!user && (pathname.startsWith("/api/admin") || pathname.startsWith("/api/administration"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protect the Administration area — send to the staff portal to sign in
  if (!user && pathname.startsWith("/administration")) {
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  // Protect all other /admin/* routes
  if (!user) {
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  // Authenticated — enforce that the user holds the role for this system.
  // An account with no roles is blocked from everything (strict).
  const required = requiredRoleForPath(pathname);
  if (required && !getRoles(user).includes(required)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Send to the chooser, which shows the system greyed out with a reason.
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/administration/:path*",
    "/api/administration/:path*",
  ],
};
