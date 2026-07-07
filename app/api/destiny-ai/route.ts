import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import { getOpenAI } from "@/lib/openaiClient";
import { buildSystemPrompt } from "@/lib/destinyAi/systemPrompt";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/destinyAi/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DESTINY_AI_MODEL = "gpt-4.1-mini";
const MAX_TOOL_ROUNDS = 3;

// Each streamed line is one JSON event: text tokens, tool lifecycle, or done/error.
type StreamEvent =
  | { type: "text"; value: string }
  | { type: "tool_call"; id: string; name: string }
  | { type: "tool_result"; id: string; name: string; data: unknown }
  | { type: "error"; message: string }
  | { type: "done" };

function writeEvent(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, event: StreamEvent) {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

// Simple in-memory rate limiting, matching the pattern used by /api/chat.
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
  return r.count > 15;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Stream one model turn, accumulating text + any tool call deltas by index. */
async function streamTurn(
  openai: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<{ content: string; toolCalls: { id: string; name: string; args: string }[] }> {
  const stream = await openai.chat.completions.create({
    model: DESTINY_AI_MODEL,
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: "auto",
    max_tokens: 600,
    temperature: 0.3,
    stream: true,
  });

  let content = "";
  const acc = new Map<number, { id: string; name: string; args: string }>();

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    if (delta.content) {
      content += delta.content;
      writeEvent(controller, encoder, { type: "text", value: delta.content });
    }

    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const existing = acc.get(tc.index) ?? { id: "", name: "", args: "" };
        if (tc.id) existing.id = tc.id;
        if (tc.function?.name) existing.name += tc.function.name;
        if (tc.function?.arguments) existing.args += tc.function.arguments;
        acc.set(tc.index, existing);
      }
    }
  }

  return { content, toolCalls: Array.from(acc.values()) };
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
    messages = body.messages.slice(-10);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  for (const m of messages) {
    if (
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.length > 2000
    ) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }
  }

  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role !== "user" || !lastMsg.content?.trim() || lastMsg.content.length > 500) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const openai = getOpenAI();
  if (!openai) {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        writeEvent(controller, encoder, {
          type: "text",
          value: "Destiny AI isn't available right now — please try again shortly, or get in touch and we'll be glad to help.",
        });
        writeEvent(controller, encoder, { type: "done" });
        controller.close();
      },
    });
    return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8" } });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: "system", content: buildSystemPrompt() },
          ...messages.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
        ];

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const { content, toolCalls } = await streamTurn(openai, convo, controller, encoder);

          if (toolCalls.length === 0) break;

          convo.push({
            role: "assistant",
            content: content || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: tc.args },
            })),
          });

          const results = await Promise.all(
            toolCalls.map(async (tc) => {
              writeEvent(controller, encoder, { type: "tool_call", id: tc.id, name: tc.name });
              const result = await executeTool(tc.name, tc.args);
              writeEvent(controller, encoder, { type: "tool_result", id: tc.id, name: tc.name, data: result.data });
              return { tc, result };
            }),
          );

          for (const { tc, result } of results) {
            convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result.data) });
          }
        }
      } catch (err) {
        console.error("[destiny-ai]", err);
        writeEvent(controller, encoder, {
          type: "error",
          message: "Something went wrong — please try again in a moment.",
        });
      } finally {
        writeEvent(controller, encoder, { type: "done" });
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
