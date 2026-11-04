import { createClient } from "@/utils/supabase/middleware";
import { createServiceClient } from "@/utils/supabase/service";
import { ADMIN_ROLES, getRoles, hasAccess, type RoleFlags } from "@/lib/adminRoles";
import { isLinkedToStaff } from "@/lib/staffPortalAuth";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { assuranceLevelOf, hasAuthenticator, TWO_FACTOR_CODES, TWO_FACTOR_PATH } from "@/lib/twoFactor";
import { PORTAL_OPEN } from "@/lib/portalStatus";
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

// Roles are looked up on every /admin page and API call, and a dashboard load
// makes several at once. Each lookup is a database round trip, so keep the
// answer per server instance for a few seconds. The cost is that a role
// change can take up to ROLES_TTL_MS to bite on an instance that has already
// seen this user; the tradeoff is deliberate and the window is short.
const ROLES_TTL_MS = 15_000;
const rolesCache = new Map<string, { roles: RoleFlags; expires: number }>();

async function getRolesCached(userId: string): Promise<RoleFlags> {
  const now = Date.now();
  const hit = rolesCache.get(userId);
  if (hit && hit.expires > now) return hit.roles;

  const roles = await getRoles(createServiceClient(), userId);
  if (rolesCache.size > 500) rolesCache.clear();
  rolesCache.set(userId, { roles, expires: now + ROLES_TTL_MS });
  return roles;
}

/** The Destiny One admin API, the one /api/admin area that also accepts a bearer token. */
function isDestinyOneAdminApi(pathname: string): boolean {
  return /^\/api\/admin\/destiny-one(\/|$)/.test(pathname);
}

function bearerFrom(request: NextRequest): string | null {
  const m = /^Bearer\s+(.+)$/i.exec((request.headers.get("authorization") ?? "").trim());
  return m ? m[1] : null;
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
  const session = createClient(request);

  let { data: { user } } = await session.supabase.auth.getUser();
  // Read only after getUser(): a token refresh inside it swaps in a new
  // response carrying the refreshed auth cookies. Taken before, the refreshed
  // session was silently dropped.
  const { supabaseResponse } = session;

  // The D1 Admin desktop app (apps/d1-admin) has no cookie jar, so for the
  // Destiny One admin API only, a Supabase access token in
  // `Authorization: Bearer …` stands in for the cookie session. Every check
  // below (roles, ROUTE_RULES, actor headers for the audit log) runs exactly
  // as it does for a cookie. Every other /api/admin path stays cookie-only.
  let bearerToken: string | null = null;
  if (!user && isDestinyOneAdminApi(pathname)) {
    const token = bearerFrom(request);
    if (token) {
      const { data } = await createServiceClient().auth.getUser(token);
      user = data.user ?? null;
      if (user) bearerToken = token;
    }
  }

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
  // The staff portal is closed (lib/portalStatus.ts). Its API is refused
  // outright, before any auth, and every portal page lands on /portal, where
  // the layout shows "Coming Summer 2027" to anyone, signed in or not.
  if (!PORTAL_OPEN && pathname.startsWith("/api/portal")) {
    return NextResponse.json({ error: "The staff portal is closed." }, { status: 404 });
  }
  if (!PORTAL_OPEN && pathname.startsWith("/portal")) {
    if (pathname !== "/portal" || request.method !== "GET") {
      return NextResponse.redirect(new URL("/portal", request.url), { status: 303 });
    }
    return supabaseResponse;
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
  const roles = await getRolesCached(user.id);

  // Two-factor sign-in (lib/twoFactor.ts). A password alone gets no admin
  // into the admin: the session has to be aal2, i.e. it has also passed a code
  // from an authenticator app. Applies to the cookie session and to the D1
  // Admin desktop app's bearer token alike — the token checked is whichever
  // one getUser() just accepted, so the decoded level is trustworthy.
  //
  // Only for accounts that hold an admin role. A Destiny One leader with no
  // role still asks /api/admin/destiny-one/whoami what they can see (the
  // answer is "nothing"), and that mustn't need an authenticator. Checked
  // before hasAccess, so a 403 never tells a half-signed-in caller anything.
  const accessToken =
    bearerToken ?? (await session.supabase.auth.getSession()).data.session?.access_token ?? null;
  if (ADMIN_ROLES.some((role) => roles[role]) && assuranceLevelOf(accessToken) !== "aal2") {
    const enrolled = hasAuthenticator(user);
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        {
          error: enrolled
            ? "Enter the code from your authenticator app to continue."
            : "Set up two-factor sign-in on the website before using the admin.",
          code: enrolled ? TWO_FACTOR_CODES.required : TWO_FACTOR_CODES.setupRequired,
        },
        { status: 401 },
      );
    }
    const url = new URL(TWO_FACTOR_PATH, request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

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
