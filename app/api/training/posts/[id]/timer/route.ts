import { NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// HMAC key for the read-timer tokens. Prefer a dedicated secret; otherwise
// derive one from the service-role key (never used raw) so it's stable across
// serverless instances. A per-boot random key is the last resort — tokens then
// only survive within one instance, which is acceptable for a reading timer.
function timerSecret(): Buffer {
  if (process.env.TRAINING_TIMER_SECRET) {
    return Buffer.from(process.env.TRAINING_TIMER_SECRET);
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
      .update("training-timer")
      .digest();
  }
  return randomBytes(32);
}

const SECRET = timerSecret();

function sign(payload: unknown) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verify(token: string) {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;
    const expected = createHmac("sha256", SECRET).update(data).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return null;
    }
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
