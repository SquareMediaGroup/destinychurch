import { createClient } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, supabaseResponse } = createClient(request);

  const { data: { user } } = await supabase.auth.getUser();

  // Already logged in — send away from login page
  if (pathname === "/admin/login") {
    if (user) {
      return NextResponse.redirect(new URL("/admin/redirects", request.url));
    }
    return supabaseResponse;
  }

  // Protect all other /admin/* routes
  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
