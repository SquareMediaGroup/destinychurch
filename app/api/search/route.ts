import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { runSmartSearch, cooldownAnswer, FALLBACK_ANSWERS } from "@/lib/smartSearch";

// Smart Search API. Always responds with a usable `answer` — never null, never
// "no results". On cooldown it returns a friendly rate-limit message.
export async function GET(request: NextRequest) {
  // Rate limited → friendly cooldown response (still a real answer).
  if (checkRateLimit(clientIp(request)).limited) {
    return NextResponse.json({ ...cooldownAnswer(), cooldown: true });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  // Too short / too long → gentle guidance instead of an empty result.
  if (q.length < 2 || q.length > 150) {
    return NextResponse.json({ answer: FALLBACK_ANSWERS.tooShort, page: null, ctaLabel: null });
  }

  const result = await runSmartSearch(q);
  return NextResponse.json(result);
}
