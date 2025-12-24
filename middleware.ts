import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TURNSTILE_COOKIE } from "@/lib/turnstile";

const bypassPrefixes = ["/api", "/_next"];
const bypassExact = ["/turnstile", "/auth/callback", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (bypassExact.includes(pathname)) return NextResponse.next();
  if (bypassPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  if (!process.env.SITE_KEY) return NextResponse.next();

  const cookie = request.cookies.get(TURNSTILE_COOKIE)?.value;
  if (cookie === "1") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/turnstile";
  url.searchParams.set("from", `${pathname}${search}`);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/:path*"],
};
