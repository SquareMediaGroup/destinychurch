// One DestinyAI turn in Destiny Admin: the conversation in, a reply out, plus
// either a question with options or a plan waiting to be confirmed.
//
// Runs Claude through the Vercel AI Gateway (AI SDK). Locally that needs
// AI_GATEWAY_API_KEY; on Vercel the deployment's OIDC token is used.

import "server-only";
import { gateway, generateText, hasToolCall, stepCountIs, tool as sdkTool, type ModelMessage, type ToolSet } from "ai";
import { z } from "zod";
import { AgentError, type AgentActor } from "./context.server";
import { createPlan, validFollowUps, type Proposal } from "./plans.server";
import { buildSystemPrompt } from "./prompt";
import { AGENT_TOOLS } from "./registry.server";
import type { ToolContext } from "./tool";
import type { AssistantQuestion, AssistantReply, ChatMessage } from "./types";

export const ADMIN_AGENT_MODEL = process.env.DESTINYAI_ADMIN_MODEL || "anthropic/claude-sonnet-5.5";

const MAX_STEPS = 12;
const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 4000;

export function gatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
}

const followUpSchema = z
  .array(
    z.object({
      label: z.string().min(3).max(100).describe('What the switch says, e.g. "Remove it automatically at 15:00 on Fri 6 Nov".'),
      changes: z.record(z.string(), z.unknown()).describe("Arguments of this same tool to change when switched on."),
      on_by_default: z.boolean(),
    }),
  )
  .max(3)
  .optional()
  .describe("Optional extras the admin can switch on or off on the plan card.");

/** The conversation as the model sees it: alternating, trimmed, ending on the admin. */
export function cleanMessages(messages: ChatMessage[]): ModelMessage[] {
  const out: ModelMessage[] = [];
  for (const m of messages.slice(-MAX_MESSAGES)) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const content = String(m.content ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content as string}\n\n${content}`;
    } else {
      out.push({ role: m.role, content });
    }
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

export async function runTurn(actor: AgentActor, messages: ChatMessage[]): Promise<AssistantReply> {
  if (!gatewayConfigured()) {
    throw new AgentError("DestinyAI isn't connected to the AI Gateway. Set AI_GATEWAY_API_KEY.", 503);
  }
  const conversation = cleanMessages(messages);
  const lastUser = conversation[conversation.length - 1];
  if (!lastUser || lastUser.role !== "user") throw new AgentError("Say what you'd like DestinyAI to do.");

  const now = new Date();
  const ctx: ToolContext = { actor, now: now.getTime() };
  const proposals: Proposal[] = [];
  let question: AssistantQuestion | null = null;

  const tools: ToolSet = {
    ask_user: sdkTool({
      description:
        "Ask the admin one question when a detail that changes the outcome is missing or ambiguous. Ends your turn. Give 2-4 short options they can tap.",
      inputSchema: z.object({
        question: z.string().min(3).max(200),
        options: z.array(z.string().min(1).max(60)).max(4),
        allow_free_text: z.boolean().optional(),
      }),
      execute: async (input) => {
        question = {
          question: input.question,
          options: input.options,
          allow_free_text: input.allow_free_text !== false,
        };
        return { asked: true };
      },
    }),
  };

  for (const t of AGENT_TOOLS) {
    if (t.kind === "read") {
      tools[t.name] = sdkTool({
        description: t.description,
        inputSchema: t.schema,
        execute: async (args: Record<string, unknown>) => {
          try {
            return await t.run(args, ctx);
          } catch (err) {
            return { error: (err as Error).message };
          }
        },
      });
      continue;
    }
    tools[t.name] = sdkTool({
      description: t.description,
      inputSchema: t.schema.extend({ follow_ups: followUpSchema }),
      execute: async (input: Record<string, unknown>) => {
        const { follow_ups, ...args } = input as Record<string, unknown> & { follow_ups?: Proposal["follow_ups"] };
        try {
          const assessment = await t.assess(args, ctx);
          const kept = validFollowUps(t.name, args, follow_ups ?? []);
          proposals.push({ tool: t.name, args, follow_ups: kept, assessment });
          return {
            proposed: true,
            step: proposals.length,
            label: assessment.label,
            detail: assessment.detail,
            needs_second_confirmation: assessment.risk === "destructive",
            warnings: assessment.warnings ?? [],
            follow_ups_shown: kept.map((f) => f.label),
            note: "Not done yet. It runs only when the admin confirms the plan.",
          };
        } catch (err) {
          return { error: (err as Error).message };
        }
      },
    });
  }

  let text = "";
  try {
    const result = await generateText({
      model: gateway(ADMIN_AGENT_MODEL),
      instructions: buildSystemPrompt({ email: actor.email, roles: actor.roles, now }),
      messages: conversation,
      tools,
      stopWhen: [stepCountIs(MAX_STEPS), hasToolCall("ask_user")],
      maxOutputTokens: 2000,
      abortSignal: AbortSignal.timeout(55_000),
    });
    text = result.text.trim();
  } catch (err) {
    console.error("⚠️ DestinyAI admin turn failed:", err);
    throw new AgentError("DestinyAI couldn't finish that. Try again in a moment.", 502);
  }

  // A question means the model isn't sure yet, so anything it proposed in the
  // same turn is dropped rather than shown next to the question.
  const asked = question as AssistantQuestion | null;
  if (asked) {
    return { reply: text, question: asked, plan: null };
  }

  const plan = proposals.length
    ? await createPlan(actor, String(lastUser.content), text || null, proposals)
    : null;

  return {
    reply: text || (plan ? "Here's the plan. Check it over, then confirm." : "I couldn't work out what to do there. Could you say a bit more?"),
    question: null,
    plan,
  };
}
