import { NextResponse, type NextRequest } from "next/server";

/**
 * /lite route handler
 *
 * Any path whose last segment is exactly "lite" (e.g. /sermons/lite, /lite,
 * /about/lite) is redirected to the same path minus that segment, with the
 * query-string flag ?lite=1 appended so the client-side PerformanceGate can
 * detect it and apply the lite-mode settings + toast.
 *
 * Examples:
 *   /lite           → /?lite=1
 *   /sermons/lite   → /sermons?lite=1
 *   /about/lite     → /about?lite=1
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Only intercept when the final segment is exactly "lite".
  if (pathname === "/lite" || pathname.endsWith("/lite")) {
    const base = pathname === "/lite" ? "/" : pathname.slice(0, -"/lite".length) || "/";
    const url = request.nextUrl.clone();
    url.pathname = base;

    // Preserve any existing query params and add lite=1.
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    params.set("lite", "1");
    url.search = "?" + params.toString();

    return NextResponse.redirect(url, { status: 302 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico, robots.txt, sitemap.xml
     * - API routes (already handle their own logic)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/).*)",
  ],
};
