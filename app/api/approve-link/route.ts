import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sermonId = searchParams.get("sid");
  const token = searchParams.get("token");

  if (!sermonId || !token) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  // Placeholder: verify token, link podcast + YouTube, run Whisper + GPT, save to DB.
  return NextResponse.json({
    status: "ok",
    message: "Approval placeholder - implement token verification and processing",
    sermonId,
  });
}
