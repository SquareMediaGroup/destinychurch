import { createClient } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /lite route redirect ──────────────────────────────────────────────────
  // Any path whose last segment is exactly "lite" (e.g. /sermons/lite, /lite)
  // is redirected to the same base path with ?lite=1 appended so the
  // client-side PerformanceGate can apply lite mode and show the toast.
  //
  //   /lite          → /?lite=1
  //   /sermons/lite  → /sermons?lite=1
  //   /about/lite    → /about?lite=1
  if (pathname === "/lite" || pathname.endsWith("/lite")) {
    const base =
      pathname === "/lite"
        ? "/"
        : pathname.slice(0, -"/lite".length) || "/";
    const url = request.nextUrl.clone();
    url.pathname = base;
    const params = new URLSearchParams(url.search.slice(1));
    params.set("lite", "1");
    url.search = "?" + params.toString();
    return NextResponse.redirect(url, { status: 302 });
  }
  const { supabase, supabaseResponse } = createClient(request);

  const { data: { user } } = await supabase.auth.getUser();

  // Allow unauthenticated logout endpoint so sign-out always succeeds
  if (pathname === "/api/admin/logout") {
    return supabaseResponse;
  }

  // Stale bookmark for the removed login page — bounce to the dashboard
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
  if (!user && pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protect all /admin/* routes — single role model: any authenticated user
  // has full /admin access, no per-path role check needed anymore.
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // /lite redirect — must come first conceptually; order here doesn't matter
    "/lite",
    "/:path*/lite",
    // Admin auth guard
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
