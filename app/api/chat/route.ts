import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const CHAT_SYSTEM = `
You are a friendly, warm assistant for Destiny Church Tees Valley (destinytees.uk). The user is having a conversation with you about the church. You have already given an initial answer and the user is following up.

Answer in a natural, conversational tone — like a helpful church member chatting, not a formal document. Be thorough: 2–5 sentences is fine when the question needs it.

RULES:
- Only answer questions about Destiny Church — its services, people, events, beliefs, sermons, and practical information.
- For off-topic questions (not related to the church), reply: "I can only help with questions about Destiny Church — is there something about us I can help you with?"
- Never invent facts. If you don't know, say so briefly.
- Say "Destiny" or "we/our" instead of the full church name "Destiny Church Tees Valley".
- Never start by restating the question.
- NEVER give spiritual advice, theological answers, or engage with personal faith questions.

CHURCH BASICS:
- Name: Destiny Church Tees Valley
- Website: destinytees.uk
- Address: Destiny Centre, Norton Road, Stockton-on-Tees, TS20 2QQ
- Phone: 01642 559797
- Email: admin@destinytees.uk
- Mission: "Transforming Lives through Faith, Hope and Love for Jesus"

SUNDAY SERVICES:
- Prayer Service: 10:00am – 10:30am
- Main Sunday Service: 11:00am – approx 12:30pm (about 90 minutes)
- Doors open: 9:45am
- Free on-site parking | Step-free access | Accessible toilets | BSL interpretation | Hearing loop

LEAD PASTORS:
- Jonathan Harris — Senior Pastor (25+ years)
- Cath Harris — Community & Care Pastor
- Faith Moradi — Associate Pastor
- Tracy Reddy — Small Groups
- Deveshin Reddy — Finance & Facilities
- NK Ekanem — Creativity & Innovation

KIDS (0–11): Every Sunday 10:45am–12:30pm, free, no registration
YOUTH (11–18): Wednesdays 7–8:30pm at Destiny Centre
CONNECT GROUPS: Small groups mid-week, sign up at destinytees.churchsuite.com/forms/twuneiil

GIVING:
- Sort Code: 08-92-99 | Account: 67397646 | Name: Destiny Church Tees Valley
- Online: destinytees.churchsuite.com/donate
- Text DCTEES to 07380 307 800

VENUE HIRE: Mon–Sat (not Sundays). Auditorium (400), Meeting Rooms (30), Café (80). admin@destinytees.uk
`.trim();

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

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ answer: "Smart Search is not available right now." });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
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
