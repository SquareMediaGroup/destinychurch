import { createClient } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, supabaseResponse } = createClient(request);

  const { data: { user } } = await supabase.auth.getUser();

  // Allow unauthenticated logout endpoint so sign-out always succeeds
  if (pathname === "/api/admin/logout") {
    return supabaseResponse;
  }

  // Already logged in — send away from login page
  if (pathname === "/admin/login") {
    if (user) {
      return NextResponse.redirect(new URL("/admin/redirects", request.url));
    }
    return supabaseResponse;
  }

  // Unauthenticated API requests: return 401 instead of redirecting
  if (!user && pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protect the Administration area — send to the staff portal to sign in
  if (!user && pathname.startsWith("/administration")) {
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  // Protect all other /admin/* routes
  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/administration/:path*"],
};
