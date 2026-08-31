import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { buildSmartSearchPrompt } from "@/lib/siteKnowledge";
import { FALLBACK_ANSWERS } from "@/lib/smartSearch";
import { TOOL_DEFINITIONS, executeTool, createToolContext } from "@/lib/smartSearch/tools";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Enough for a search → extract_page → answer chain, plus a round of headroom.
const MAX_TOOL_ROUNDS = 4;

// Each streamed line is one JSON event: prose tokens, tool results, or done.
// The client accumulates `text` into the assistant bubble (still parsed for the
// trailing OPTION/PAGE/CTA lines) and attaches each `tool_result` as a card.
type StreamEvent =
  | { type: "text"; value: string }
  | { type: "tool_call"; name: string }
  | { type: "tool_result"; name: string; data: unknown }
  | { type: "error"; message: string }
  | { type: "done" };

function writeEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: StreamEvent,
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  // Disable proxy buffering (e.g. nginx) so events flush as they arrive.
  "X-Accel-Buffering": "no",
} as const;

/** Single-line NDJSON fallback that still routes the visitor to Contact. */
function fallbackResponse(): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      writeEvent(controller, encoder, {
        type: "text",
        value: `${FALLBACK_ANSWERS.unavailable}\nPAGE: /contact\nCTA: Contact Us`,
      });
      writeEvent(controller, encoder, { type: "done" });
      controller.close();
    },
  });
  return new Response(body, { headers: NDJSON_HEADERS });
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
    model: SMART_SEARCH_MODEL,
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: "auto",
    max_tokens: 500,
    temperature: 0.3,
    stream: true,
    store: true,
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
  const { limited } = checkRateLimit(`chat:${clientIp(request)}`);
  if (limited) {
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

  // Every message must be a plain user/assistant turn with a bounded length —
  // never trust the client to supply roles (blocks injected "system" turns)
  // or unbounded content (blocks token-cost abuse via padded history).
  for (const m of messages) {
    if (
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.length > 2000
    ) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }
  }

  // Validate the last message is from the user and is not too long
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role !== "user" || !lastMsg.content?.trim() || lastMsg.content.length > 300) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const openai = getOpenAI();
  if (!openai) return fallbackResponse();

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Shared across every tool call in this request (tracks which URLs a
      // search surfaced, so extract_page can only open those).
      const toolCtx = createToolContext();

      try {
        const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: "system", content: buildSmartSearchPrompt() },
          ...messages.map(
            (m) =>
              ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam,
          ),
        ];

        // Run the model, execute any tool calls, feed results back, repeat until
        // it stops calling tools (or we hit the round cap).
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

          for (const tc of toolCalls) {
            writeEvent(controller, encoder, { type: "tool_call", name: tc.name });
          }

          const results = await Promise.all(
            toolCalls.map(async (tc) => {
              const result = await executeTool(tc.name, tc.args, toolCtx);
              writeEvent(controller, encoder, {
                type: "tool_result",
                name: tc.name,
                data: result.data,
              });
              return { tc, result };
            }),
          );

          for (const { tc, result } of results) {
            convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result.data) });
          }
        }
      } catch (err) {
        console.error("[chat]", err);
        writeEvent(controller, encoder, {
          type: "text",
          value: `${FALLBACK_ANSWERS.unavailable}\nPAGE: /contact\nCTA: Contact Us`,
        });
      } finally {
        writeEvent(controller, encoder, { type: "done" });
        controller.close();
      }
    },
  });

  return new Response(body, { headers: NDJSON_HEADERS });
}
