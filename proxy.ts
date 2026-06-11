import { createClient } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF defense: state-changing requests to protected routes must originate
  // from this site. Browsers always send Origin on cross-site POST/PUT/DELETE.
  if (!SAFE_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.nextUrl.host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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
