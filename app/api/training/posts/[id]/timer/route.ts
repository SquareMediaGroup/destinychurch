import { NextResponse } from "next/server";
import { createHmac } from "crypto";

// Fallback to a hardcoded string if no secret is set. This is acceptable
// since this token is just for anonymous training progress and not sensitive data.
const SECRET = process.env.SUPABASE_JWT_SECRET || "fallback-training-secret";

function sign(payload: unknown) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verify(token: string) {
  try {
    const [data, signature] = token.split(".");
    const expectedSignature = createHmac("sha256", SECRET).update(data).digest("base64url");
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (body.action === "start") {
    const token = sign({ postId: id, startedAt: Date.now() });
    return NextResponse.json({ token });
  }

  if (body.action === "verify") {
    const { token, minReadSeconds } = body;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const payload = verify(token);
    if (!payload || payload.postId !== id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const elapsedSeconds = (Date.now() - payload.startedAt) / 1000;
    if (elapsedSeconds < minReadSeconds) {
      return NextResponse.json({ 
        error: "Minimum read time not met", 
        remaining: Math.ceil(minReadSeconds - elapsedSeconds)
      }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
