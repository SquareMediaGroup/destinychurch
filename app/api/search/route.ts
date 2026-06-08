import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { runSmartSearch, cooldownAnswer, FALLBACK_ANSWERS } from "@/lib/smartSearch";
import { getSmartSearchStatus } from "@/lib/serviceStatus";

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

  // Safety net: if the health check has temporarily disabled Smart Search, give
  // a graceful reply (the floating UI is already hidden site-wide when disabled).
  if (!(await getSmartSearchStatus()).enabled) {
    return NextResponse.json({
      answer:
        "Smart Search is taking a short break right now — please try again a little later, or get in touch and we'll be glad to help.",
      page: "/contact",
      ctaLabel: "Contact Us",
    });
  }

  // Optional clarifying-option follow-up (visitor tapped a pre-filled option).
  const choiceRaw = request.nextUrl.searchParams.get("choice")?.trim();
  const choice = choiceRaw && choiceRaw.length <= 120 ? choiceRaw : undefined;

  const result = await runSmartSearch(q, choice);
  return NextResponse.json(result);
}
