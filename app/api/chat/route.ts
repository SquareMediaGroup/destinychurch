import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { CONVERSATIONAL_KNOWLEDGE } from "@/lib/siteKnowledge";
import { FALLBACK_ANSWERS } from "@/lib/smartSearch";

// Plain-text fallback the client still runs through parseAnswer, so the embedded
// PAGE/CTA lines route the visitor to Contact.
function fallbackResponse(): Response {
  return new Response(`${FALLBACK_ANSWERS.unavailable}\nPAGE: /contact\nCTA: Contact Us`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

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
  if (!openai) return fallbackResponse();

  try {
    // Stream the model's tokens straight through so the visitor sees the answer
    // appear as it's written, instead of waiting for the whole completion. The
    // client strips/parses the trailing OPTION/PAGE/CTA lines once the stream ends.
    const completion = await openai.chat.completions.create({
      model: SMART_SEARCH_MODEL,
      messages: [
        { role: "system", content: CONVERSATIONAL_KNOWLEDGE },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 500,
      temperature: 0.3,
      stream: true,
      store: true,
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const part of completion) {
            const delta = part.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          console.error("[chat] stream", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        // Disable proxy buffering (e.g. nginx) so tokens flush as they arrive.
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[chat]", err);
    return fallbackResponse();
  }
}
