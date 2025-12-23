import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "Missing secret key" },
      { status: 500 },
    );
  }

  let token = "";
  try {
    const body = await request.json();
    token = String(body?.token || "");
  } catch {
    token = "";
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing token" },
      { status: 400 },
    );
  }

  const payload = new URLSearchParams();
  payload.set("secret", secret);
  payload.set("response", token);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      },
    );
    const data = await response.json();
    return NextResponse.json({ success: Boolean(data?.success) });
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 },
    );
  }
}
