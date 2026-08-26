// "Who added the Faith Hoodie to the store?" — the ask box on /admin/audit.
//
// Super Admin only by the same fail-closed rule as the list route next door.
//
// Not streamed, unlike /api/chat. A visitor watching words appear is being
// reassured something is happening; someone auditing wants the answer *and the
// rows it came from* to arrive together, so the claim and the evidence can't be
// read apart. The response carries both.
//
// audit-exempt: POST only because a question is too long for a query string —
// this route reads the log and changes nothing. Logging questions here would
// also feed the log its own traffic: every search would then turn up the
// searches, and a week of asking would bury the week's actual changes. Reads
// are not recorded anywhere else in the admin either (nobody logs opening an
// HR record), so this is the consistent behaviour, not an exception.
//
// Degrades rather than breaks: with no OPENAI_API_KEY configured this still
// answers, by running the search itself and handing back the matching entries
// with a note. A Super Admin asking who deleted something should not be told
// "AI unavailable" when a plain search would have found it.

import { NextResponse } from "next/server";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_TOOLS, auditSystemPrompt, runAuditTool } from "@/lib/auditAI";
import type { AuditEntry } from "@/lib/audit";
import type OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Search → maybe narrow → answer. Four is one more round than that needs. */
const MAX_TOOL_ROUNDS = 4;
/** Rows shown as evidence under the answer. */
const MAX_EVIDENCE = 25;

async function earliestEntry(): Promise<string | null> {
  const { data } = await createServiceClient()
    .from("audit_log")
    .select("created_at")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.created_at ?? null;
}

/** The no-key (and last-resort) path: a plain keyword search, honestly labelled. */
async function plainSearch(question: string, note: string) {
  const { entries } = await runAuditTool("search_audit_log", {
    query: question.replace(/[?"]/g, " ").trim(),
    limit: MAX_EVIDENCE,
  });
  return NextResponse.json({
    answer:
      entries.length > 0
        ? `${note} Here are the log entries matching “${question.trim()}”, newest first.`
        : `${note} Nothing in the log matches “${question.trim()}”. Try the search box below with fewer words.`,
    entries,
    degraded: true,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "That question is too long." }, { status: 400 });
  }

  const openai = getOpenAI();
  if (!openai) {
    return plainSearch(
      question,
      "The AI assistant isn't configured (no OPENAI_API_KEY), so this is a plain keyword search.",
    );
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: auditSystemPrompt(new Date(), await earliestEntry()) },
    { role: "user", content: question },
  ];

  // Every row any tool call returned, deduplicated — the evidence panel.
  const evidence = new Map<number, AuditEntry>();

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await openai.chat.completions.create({
        model: SMART_SEARCH_MODEL,
        messages,
        tools: AUDIT_TOOLS,
        tool_choice: round === 0 ? "required" : "auto",
        temperature: 0.1,
        max_tokens: 600,
      });

      const choice = completion.choices[0]?.message;
      if (!choice) break;

      const toolCalls = choice.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return NextResponse.json({
          answer: choice.content?.trim() || "I couldn't work that one out.",
          entries: [...evidence.values()].slice(0, MAX_EVIDENCE),
        });
      }

      messages.push(choice);

      for (const call of toolCalls) {
        if (call.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // A malformed argument blob is the model's mistake to recover from —
          // hand back an empty result rather than failing the whole question.
        }
        const result = await runAuditTool(call.function.name, args);
        for (const entry of result.entries) evidence.set(entry.id, entry);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result.payload),
        });
      }
    }

    // Out of rounds with tool calls still coming: answer from what we have
    // rather than returning nothing.
    return NextResponse.json({
      answer:
        evidence.size > 0
          ? "I found these entries but couldn't summarise them — they're below, newest first."
          : "I couldn't find anything in the log for that. Try the search box below.",
      entries: [...evidence.values()].slice(0, MAX_EVIDENCE),
    });
  } catch (error) {
    console.error("⚠️ Audit ask failed:", error);
    return plainSearch(
      question,
      "The AI assistant didn't respond, so this is a plain keyword search.",
    );
  }
}
