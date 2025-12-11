import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateSummaryPointsForSermon } from "@/lib/summaryPoints";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const authed = cookieStore.get("destiny-admin")?.value === "1";
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let sermonId = "";
  try {
    const body = await request.json();
    sermonId = typeof body?.sermonId === "string" ? body.sermonId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!sermonId) {
    return NextResponse.json({ error: "Missing sermonId" }, { status: 400 });
  }

  try {
    const payload = await generateSummaryPointsForSermon(sermonId);
    return NextResponse.json({
      ok: true,
      points: payload.points.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate summary points";
    console.error(`[api] Summary point generation failed for ${sermonId}`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
