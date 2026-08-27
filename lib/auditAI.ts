// The AI half of the audit log: the tools it can use, and the prompt that tells
// it how to answer.
//
// Kept out of the route so the weekly report (app/api/cron/audit-weekly-report)
// and the ask box (/api/admin/audit/ask) share one description of what the log
// contains and how to read it. When the vocabulary in lib/audit.ts changes,
// this is the other file that has to change with it.
//
// The model never sees the whole log. It calls `search_audit_log` and
// `count_audit_log`, both of which run real Postgres queries and hand back a
// bounded, already-filtered slice — so the answer is grounded in rows a Super
// Admin can then open and read for themselves, and a year of history doesn't
// have to fit in a context window.

import "server-only";
import type OpenAI from "openai";
import { createServiceClient } from "@/utils/supabase/service";
import {
  AUDIT_ACTION_KEYS,
  AUDIT_SECTION_KEYS,
  siteDateTime,
  siteDayBounds,
  siteDayKey,
  type AuditEntry,
} from "@/lib/audit";

/** Rows a single search can return. Enough to answer, small enough to read. */
const SEARCH_LIMIT = 40;
/** Rows a count scans. Beyond this the answer says "at least". */
const COUNT_SCAN = 3000;

export const AUDIT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_audit_log",
      description:
        "Find entries in the admin audit log. Use this for any question about who did something, what changed, or when. Search by keywords from the thing itself (a product name, a page title, a person's name) — every entry has a plain-English summary that names it. Combine with actor/section/action filters to narrow. Returns the newest matches first.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Words to match against the entry's summary sentence, the name of the thing changed, or the email of who did it. Keep it to the distinctive words — 'Faith Hoodie', not 'who added the Faith Hoodie'. Omit to list everything matching the other filters.",
          },
          actor_email: {
            type: "string",
            description:
              "Only entries by this admin. Partial addresses work ('sarah' matches sarah@…).",
          },
          section: {
            type: "string",
            enum: AUDIT_SECTION_KEYS as unknown as string[],
            description: "Only entries from one admin area.",
          },
          action: {
            type: "string",
            enum: AUDIT_ACTION_KEYS as unknown as string[],
            description:
              "Only one kind of change. 'create' is adding something, 'delete' removing it, 'update' editing it.",
          },
          since: {
            type: "string",
            description:
              "Only entries at or after this. Use a plain YYYY-MM-DD date — it is resolved to that day's start in UK local time for you. Resolve relative dates ('last week') against the current date given in the system prompt.",
          },
          until: {
            type: "string",
            description:
              "Only entries at or before this. A plain YYYY-MM-DD date covers the whole of that day in UK local time.",
          },
          limit: {
            type: "number",
            description: `Maximum entries to return (default 20, max ${SEARCH_LIMIT}).`,
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "count_audit_log",
      description:
        "Count entries grouped by who did them, which section they were in, or what kind of change they were. Use for 'how many', 'who has been busiest', 'what changed most' — not for questions about one specific thing.",
      parameters: {
        type: "object",
        properties: {
          group_by: {
            type: "string",
            enum: ["actor_email", "section", "action", "entity"],
            description: "What to group the counts by.",
          },
          since: {
            type: "string",
            description: "YYYY-MM-DD — count from the start of this day (UK local time).",
          },
          until: {
            type: "string",
            description: "YYYY-MM-DD — count up to the end of this day (UK local time).",
          },
          section: {
            type: "string",
            enum: AUDIT_SECTION_KEYS as unknown as string[],
            description: "Limit the count to one admin area.",
          },
        },
        required: ["group_by"],
      },
    },
  },
];

/**
 * Turn a date the model wrote into the instant a query should use.
 *
 * A bare `YYYY-MM-DD` is resolved against the church's clock, not UTC: asked
 * for "today" in August, comparing against UTC midnight would quietly include
 * the last hour of yesterday evening. Anything else (a full timestamp) is
 * passed through untouched.
 */
function resolveSince(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return siteDayBounds(value.trim())?.start ?? value.trim();
}

function resolveUntil(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  // A bare date means the whole of that day, so the bound is its last instant.
  return siteDayBounds(value.trim())?.end ?? value.trim();
}

/** Escape the wildcards PostgREST's `ilike` treats as special. */
function likeTerm(query: string): string {
  return `%${query.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
}

/**
 * What the model gets back for each row.
 *
 * Deliberately not the whole entry: the `changes` blob can be kilobytes of
 * before/after values, and the model doesn't need it to say who did what. The
 * ids come back so the page can show the full rows underneath the answer, which
 * is where the detail belongs.
 */
function forModel(entry: AuditEntry) {
  return {
    id: entry.id,
    // Already formatted in the church's time zone. The model used to be handed
    // the raw UTC timestamp and asked to "write it naturally", which through
    // British Summer Time meant every time it quoted was an hour early. It
    // cannot get a conversion wrong that it is never asked to do.
    when: siteDateTime(entry.created_at),
    who: entry.actor_email ?? "system",
    action: entry.action,
    section: entry.section,
    what: entry.summary,
    thing: entry.entity_label ?? entry.entity,
    changed_fields: entry.changes ? Object.keys(entry.changes) : [],
  };
}

export interface AuditToolResult {
  /** Rendered back to the model as the tool response. */
  payload: unknown;
  /** Full rows, so the page can show the evidence behind the answer. */
  entries: AuditEntry[];
}

export async function runAuditTool(
  name: string,
  args: Record<string, unknown>,
): Promise<AuditToolResult> {
  const supabase = createServiceClient();

  if (name === "search_audit_log") {
    const limit = Math.min(Number(args.limit) || 20, SEARCH_LIMIT);
    let query = supabase.from("audit_log").select("*").order("id", { ascending: false });

    if (typeof args.query === "string" && args.query.trim()) {
      const term = likeTerm(args.query.trim());
      query = query.or(
        `summary.ilike.${term},entity_label.ilike.${term},entity.ilike.${term},actor_email.ilike.${term}`,
      );
    }
    if (typeof args.actor_email === "string" && args.actor_email.trim()) {
      query = query.ilike("actor_email", likeTerm(args.actor_email.trim()));
    }
    if (typeof args.section === "string") query = query.eq("section", args.section);
    if (typeof args.action === "string") query = query.eq("action", args.action);
    const since = resolveSince(args.since);
    if (since) query = query.gte("created_at", since);
    const until = resolveUntil(args.until);
    if (until) query = query.lte("created_at", until);

    const { data, error } = await query.limit(limit);
    if (error) {
      return { payload: { error: error.message }, entries: [] };
    }

    const entries = (data ?? []) as AuditEntry[];
    return {
      payload: {
        found: entries.length,
        // Say so explicitly: without this the model reads a full page as "that
        // is all of them" and answers a "how many" question with 40.
        truncated: entries.length === limit,
        entries: entries.map(forModel),
      },
      entries,
    };
  }

  if (name === "count_audit_log") {
    const column = String(args.group_by);
    if (!["actor_email", "section", "action", "entity"].includes(column)) {
      return { payload: { error: "Unknown group_by." }, entries: [] };
    }

    let query = supabase
      .from("audit_log")
      .select(column)
      .order("id", { ascending: false });
    const since = resolveSince(args.since);
    if (since) query = query.gte("created_at", since);
    const until = resolveUntil(args.until);
    if (until) query = query.lte("created_at", until);
    if (typeof args.section === "string") query = query.eq("section", args.section);

    const { data, error } = await query.limit(COUNT_SCAN);
    if (error) return { payload: { error: error.message }, entries: [] };

    // `column` is a runtime string, so supabase-js can't type the projection —
    // it widens the rows to its error union. Narrowing through `unknown` is the
    // honest cast here; the whitelist above is what makes it safe.
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const value = String(row[column] ?? "unknown");
      counts[value] = (counts[value] ?? 0) + 1;
    }

    return {
      payload: {
        group_by: column,
        total: data?.length ?? 0,
        at_least: (data?.length ?? 0) >= COUNT_SCAN,
        counts: Object.fromEntries(
          Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 30),
        ),
      },
      entries: [],
    };
  }

  return { payload: { error: `Unknown tool ${name}` }, entries: [] };
}

/**
 * The system prompt for the ask box.
 *
 * The two rules that matter: never answer from memory (every claim has to come
 * out of a tool call), and say plainly when the log doesn't go back far enough.
 * The log started the day it shipped, and an admin who asks about something
 * from before that must be told it isn't recorded rather than given a
 * confident-sounding guess.
 */
export function auditSystemPrompt(now: Date, loggingSince: string | null): string {
  return `You answer questions about the admin audit log for Destiny Church Tees Valley's website.

Today is ${siteDateTime(now.toISOString())} (${siteDayKey(now)}), UK local time. Every time you are given is already in UK local time and already written out — quote it exactly as given. Never convert a time, never recompute one, and never assume UTC.

${
  loggingSince
    ? `The log's earliest entry is ${siteDateTime(loggingSince)}. Nothing before that was recorded.`
    : "The log is empty — nothing has been recorded yet."
}

HOW TO ANSWER
- Always call a tool first. Never answer from memory or guess: if a tool didn't return it, you don't know it.
- Name the person by the email in the entry, and say when — copying the entry's \`when\` verbatim rather than rephrasing the clock time.
- One or two short paragraphs, or a short list for a "what happened" question. No headings, no preamble, no restating the question.
- If a search comes back empty, try once more with fewer or different words (a shorter query, no section filter) before saying you can't find it.
- If it's still empty, say so plainly and say why it might be: nobody did it, it happened before the log started, or it isn't the kind of thing the log records (it records changes admins make in the dashboard — not what visitors do on the public site).
- If a result is marked truncated, say the number you can see is a floor, not a total.
- Don't invent field values. If asked what changed and you only have the field names, name the fields and point them at the entry for the before/after.
- British English. Plain, factual sentences — this is a record, not a story.`;
}
