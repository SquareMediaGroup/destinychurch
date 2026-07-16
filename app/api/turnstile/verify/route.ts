import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstileToken, signVerifiedCookie, TURNSTILE_SESSION_TTL_MS } from "@/lib/turnstile";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  let token: unknown;
  try {
    const body = await request.json();
    token = body?.token;
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  if (typeof token !== "string") {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const ok = await verifyTurnstileToken(token, clientIp(request));
  if (!ok) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("ts_verified", signVerifiedCookie(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TURNSTILE_SESSION_TTL_MS / 1000,
    path: "/",
  });
  return res;
}
