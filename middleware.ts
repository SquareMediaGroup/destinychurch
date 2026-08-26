import { createClient } from "@/utils/supabase/middleware";
import { createServiceClient } from "@/utils/supabase/service";
import { ADMIN_ROLES, getRoles, hasAccess, type RoleFlags } from "@/lib/adminRoles";
import { isLinkedToStaff } from "@/lib/staffPortalAuth";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Forward who this is to the route handler on the request headers.
 *
 * Middleware has just paid for `auth.getUser()` and `getRoles()`; without this
 * every audited write would pay for both again to answer "who did that".
 * lib/audit.server.ts reads them back out through `headers()`.
 *
 * `set` (not append) on a copy of the incoming headers, so a client that sends
 * its own `x-dc-actor-*` has it overwritten before any handler sees it.
 */
function withActorHeaders(
  request: NextRequest,
  supabaseResponse: NextResponse,
  user: User,
  roles: RoleFlags,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(AUDIT_ACTOR_HEADERS.id, user.id);
  requestHeaders.set(AUDIT_ACTOR_HEADERS.email, user.email ?? "");
  requestHeaders.set(
    AUDIT_ACTOR_HEADERS.roles,
    ADMIN_ROLES.filter((role) => roles[role]).join(","),
  );
  requestHeaders.set(AUDIT_ACTOR_HEADERS.path, request.nextUrl.pathname);
  requestHeaders.set(AUDIT_ACTOR_HEADERS.method, request.method);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Carry over whatever the Supabase client set while refreshing the session —
  // dropping these would sign the user out on the next request.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

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
  if (!user && pathname.startsWith("/api/portal")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The staff self-service portal — a separate auth boundary from /admin.
  // "Signed in" is not enough here: the caller also needs a linked hr_staff
  // row, checked independently of admin_roles/hasAccess below.
  if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const linked = await isLinkedToStaff(createServiceClient(), user.id);
    if (!linked) {
      if (pathname.startsWith("/api/portal")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Protect all /admin/* routes.
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Onboarding demo mode — the second of two layers that stop a tour from
  // writing anything. lib/demoMode.ts already answers these requests inside the
  // browser so they never get here; this is what catches it if that interceptor
  // is ever bypassed. Reads are untouched, so the tour still shows real data.
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    pathname.startsWith("/api/admin") &&
    request.cookies.get("dc-demo-mode")?.value === "1"
  ) {
    return NextResponse.json(
      { error: "Nothing is saved while an onboarding tour is running." },
      { status: 403 },
    );
  }

  // Access levels — each admin section requires a specific role (or
  // super_admin); see lib/adminRoles.ts for the route → role mapping.
  const roles = await getRoles(createServiceClient(), user.id);
  if (!hasAccess(roles, pathname)) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin?forbidden=1", request.url));
  }

  return withActorHeaders(request, supabaseResponse, user, roles);
}

export const config = {
  matcher: [
    // /lite redirect — must come first conceptually; order here doesn't matter
    "/lite",
    "/:path*/lite",
    // Admin auth guard
    "/admin/:path*",
    "/api/admin/:path*",
    // Staff self-service portal
    "/portal/:path*",
    "/api/portal/:path*",
  ],
};
