import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { CONVERSATIONAL_KNOWLEDGE } from "@/lib/siteKnowledge";
import { parseAnswer, FALLBACK_ANSWERS } from "@/lib/smartSearch";

// Simple rate limiting (shared in-memory store)
const rlStore = new Map<string, { count: number; reset: number }>();

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let r = rlStore.get(ip);
  if (!r || now > r.reset) {
    r = { count: 0, reset: now + 60_000 };
    rlStore.set(ip, r);
  }
  r.count++;
  return r.count > 20;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let messages: ChatMessage[];
  try {
    const body = await request.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }
    messages = body.messages.slice(-10); // cap history at last 10 messages
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Validate the last message is from the user and is not too long
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role !== "user" || !lastMsg.content?.trim() || lastMsg.content.length > 300) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({
      answer: FALLBACK_ANSWERS.unavailable,
      page: "/contact",
      ctaLabel: "Contact Us",
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: SMART_SEARCH_MODEL,
      messages: [
        { role: "system", content: CONVERSATIONAL_KNOWLEDGE },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) {
      return NextResponse.json({ answer: FALLBACK_ANSWERS.empty, page: "/contact", ctaLabel: "Contact Us" });
    }
    // Parse prose + validated PAGE/CTA + any clarifying OPTION chips, exactly like
    // the single-shot Smart Search, so the floating chat keeps its chips/CTA.
    return NextResponse.json(parseAnswer(raw));
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json({ answer: FALLBACK_ANSWERS.unavailable, page: "/contact", ctaLabel: "Contact Us" });
  }
}
