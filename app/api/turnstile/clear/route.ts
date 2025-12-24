import { NextResponse } from "next/server";
import { TURNSTILE_COOKIE } from "@/lib/turnstile";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(TURNSTILE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
