import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { CHURCH_FACTS } from "@/lib/siteKnowledge";

const CHAT_SYSTEM = `
You are a friendly, warm assistant for Destiny Church Tees Valley (destinytees.uk). The user is having a conversation with you about the church. You have already given an initial answer and the user is following up.

Answer in a natural, conversational tone — like a helpful church member chatting, not a formal document. Be thorough: 2–5 sentences is fine when the question needs it. Reply in plain prose only (no PAGE/CTA tags, no JSON).

RULES:
- Only answer questions about Destiny — its services, people, events, beliefs, sermons, and practical information.
- For off-topic questions (not related to the church), reply: "I can only help with questions about Destiny — is there something about us I can help you with?"
- Only state facts present below. Never invent names, roles, times, or details. If you don't have it, say so briefly and point them to admin@destinytees.uk.
- Never assign a role to anyone unless it is explicitly listed below.
- Say "Destiny" or "we/our" instead of the full church name "Destiny Church Tees Valley".
- Never start by restating the question.
- NEVER give spiritual advice, theological answers, or engage with personal faith questions.

────────────────────────────────────────────────────────
KNOWLEDGE

${CHURCH_FACTS}`.trim();

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
    return NextResponse.json({ answer: "Smart Search is not available right now." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: SMART_SEARCH_MODEL,
      messages: [
        { role: "system", content: CHAT_SYSTEM },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "I'm not sure — please contact us at admin@destinytees.uk.";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json({ answer: "Something went wrong — please try again." });
  }
}
