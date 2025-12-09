import { NextResponse } from "next/server";
import { syncSermons } from "@/lib/sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Math.max(1, Math.min(Number(limitParam) || 25, 50));

  try {
    const result = await syncSermons({ limit });
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
