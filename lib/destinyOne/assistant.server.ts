// Destiny One — DestinyAI: the website's Smart Search, answering in chat.
//
// Two ways to ask it (see migration 20261009_02):
//   • its one-to-one chat (group kind "assistant"): every message there is a
//     question, and it reads that chat's recent history for context;
//   • "@DestinyAI" in a group: it answers as a reply to the asking message.
//
// What it can read in a group is deliberately small. It is not a member and
// never sees the chat. It is handed the asking message, plus the message that
// one replies to and that message's own reply chain (up to REPLY_CHAIN
// messages), and nothing else, so "reply to a message, then tag @DestinyAI"
// is how you give it context. Only messages the asker can see themselves are
// ever handed over (sent since they joined, not deleted, not from someone
// they've blocked).
//
// It has every Smart Search tool (lib/smartSearch/tools.ts), plus the
// ChurchSuite calendar (find_events) and an event card it can attach to its
// answer (share_event).
//
// Runs from after(): the asker's own message has already been sent, so a slow
// or failing answer never holds that up. On failure DestinyAI says so in the
// chat rather than going quiet.

import "server-only";
import type OpenAI from "openai";
import {
  DESTINY_AI_ID,
  DESTINY_AI_NAME,
  contentPreview,
  mentionsDestinyAI,
  stripDestinyAIMention,
  type D1EventContent,
  type D1GroupKind,
  type D1Message,
} from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { CHURCH_FACTS } from "@/lib/siteKnowledge";
import { TOOL_DEFINITIONS, createToolContext, executeTool, type ToolContext } from "@/lib/smartSearch/tools";
import type { Caller } from "@/lib/destinyOne/auth.server";
import { blockedIds, broadcastNewMessage, broadcastToGroup, getMessage, listMessages } from "@/lib/destinyOne/chat.server";
import { messageTerms, sealBody, sealContent } from "@/lib/destinyOne/crypto.server";
import { buildEventSnapshot, upcomingEventSeries } from "@/lib/destinyOne/events.server";
import { fromDbError, limit } from "@/lib/destinyOne/http";
import { pushNewMessage } from "@/lib/destinyOne/push.server";

const MAX_TOOL_ROUNDS = 4;
/** How far up a reply chain DestinyAI is shown, in a group. */
const REPLY_CHAIN = 6;
/** How much of its own chat DestinyAI re-reads each time. */
const DM_HISTORY = 16;
/** Questions per member per minute (one-to-one and groups together). */
const PER_MINUTE = 6;
const MAX_ANSWER_CHARS = 3500;
const TYPING_EVERY_MS = 3500;

const SORRY = "Sorry, I couldn't answer that just now. Please try again in a moment.";
const TOO_MANY = "You've asked me a lot in the last minute. Give me a moment, then ask again.";
const TEXT_ONLY = "I can only read text at the moment, so I can't see photos, files or voice messages. Could you type your question?";

// ── Tools only DestinyAI has ────────────────────────────────────────────────

const EVENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "find_events",
      description:
        "Search Destiny's live ChurchSuite calendar: every upcoming event, with dates, times, location, a summary and the sign-up link. Use it for anything about what's on, when something is, or how to sign up. With no query it lists everything in the date range.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Words to match against event names and descriptions, e.g. 'youth', 'baptism', 'women'. Leave out to list everything." },
          from_date: { type: "string", description: "YYYY-MM-DD. Only events with a date on or after this. Defaults to today." },
          to_date: { type: "string", description: "YYYY-MM-DD. Only events with a date on or before this." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "share_event",
      description:
        "Attach ONE event from find_events to your answer as a tappable card (with its picture, date and link). Use it when your answer is about one specific event. At most once per answer.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "The event's slug, copied from find_events." },
          series_key: { type: "string", description: "The event's seriesKey, copied from find_events." },
        },
        required: ["slug", "series_key"],
        additionalProperties: false,
      },
    },
  },
];

const londonDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/London" }) : null);
const londonWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

async function runFindEvents(args: { query?: string; from_date?: string; to_date?: string }) {
  let series;
  try {
    series = await upcomingEventSeries();
  } catch {
    return { available: false, reason: "The ChurchSuite calendar isn't responding right now." };
  }
  const from = args.from_date || londonDate(new Date().toISOString())!;
  const to = args.to_date || null;
  const words = (args.query ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 1);

  const events = series
    .map((s) => {
      const dates = s.occurrences.filter((o) => {
        const d = londonDate(o.startsAt);
        return d && d >= from && (!to || d <= to);
      });
      return { s, dates };
    })
    .filter(({ s, dates }) => {
      if (!dates.length) return false;
      if (!words.length) return true;
      const hay = `${s.name} ${s.summary} ${s.categoryName ?? ""} ${s.location?.name ?? ""}`.toLowerCase();
      return words.some((w) => hay.includes(w));
    })
    .slice(0, words.length ? 12 : 40)
    .map(({ s, dates }) => ({
      name: s.name,
      slug: s.slug,
      seriesKey: s.seriesKey,
      category: s.categoryName,
      next: londonWhen(dates[0].startsAt),
      ends: londonWhen(dates[0].endsAt),
      moreDates: dates.slice(1, 6).map((d) => londonWhen(d.startsAt)),
      totalUpcomingDates: dates.length,
      location: s.location ? [s.location.name, s.location.address].filter(Boolean).join(", ") : null,
      // The full description only when there are few matches, to keep the prompt small.
      summary: words.length ? s.summary : s.summary.slice(0, 120),
      signupUrl: s.signupUrl,
      webUrl: s.webUrl,
    }));
  return { available: true, from, to, count: events.length, events };
}

// ── Prompt ──────────────────────────────────────────────────────────────────

function systemPrompt(where: { kind: "dm"; firstName: string } | { kind: "group"; groupName: string; askerName: string }): string {
  const now = new Date();
  const today = now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Europe/London" });

  const place =
    where.kind === "dm"
      ? `You are in a private one-to-one chat with ${where.firstName}. Earlier messages in this chat are included for context.`
      : `${where.askerName} tagged you in a group chat called "${where.groupName}". You are NOT a member of this group and cannot read it. You only see the message that tagged you, plus the message it replies to (and that one's replies), if any. If they refer to something you weren't shown, say so kindly and explain: reply to the message you want me to look at, then tag @DestinyAI. Several people can see your answer.`;

  return `You are DestinyAI, the assistant inside Destiny One, the members' app of Destiny Church Tees Valley. You answer church members' questions, some of whom are under 18.

WHERE YOU ARE
${place}

TODAY: ${today}, Europe/London.

HOW TO REPLY
- This is a chat message on a phone. Be warm, natural and brief: usually 1-4 sentences. A short list with "- " is fine when it genuinely helps (e.g. several events).
- Plain text only: no markdown headings, bold, italics, tables or code. No emojis.
- Never start by restating the question, and don't end with offers like "Let me know if you want more details". Say "Destiny" or "we/our", not "Destiny Church Tees Valley".
- You may include a link only if it came from the KNOWLEDGE below or a tool result. Never invent one.
- If someone just says hello or thanks, reply in a line and say what you can help with (events, services, groups, sermons, giving, getting involved).

GROUNDING
- Only state facts from KNOWLEDGE below or from a tool result in this conversation. Never guess names, roles, dates, times, prices or contact details.
- For anything about what's on, when something is, or signing up: ALWAYS call find_events first. It is the live ChurchSuite calendar. Resolve "this Sunday", "next week" etc. to dates using TODAY. Regular weekly things (Sunday services, Destiny Kids, Destiny Youth on Wednesdays) are in KNOWLEDGE: mention them too when they fit the question.
- If your answer is about one particular event, also call share_event for it: the card shows its picture, date and link, so don't paste its link or offer to send one. Otherwise, give the sign-up link (signupUrl) when there is one. Never say "let me know if you want the link": just give it.
- For talks and preaches, use find_sermons. For other real-world facts that help someone engage with Destiny, use search_web (and extract_page to read a result in full).
- If you can't find something, say so plainly and suggest asking a leader or emailing admin@destinytees.uk.

PRIVACY
- You know nothing about individual members and can't see anyone's chats, profiles or contact details beyond what you were shown here. Never guess about a person.
- Don't repeat personal details from the conversation back into a group unnecessarily.

FAITH
- You can share what Destiny believes (CORE BELIEFS) and point people to services, Alpha and Connect Groups. For personal spiritual or pastoral questions, answer gently and briefly, then encourage them to talk to a pastor or their Connect Group leader. Don't give medical, legal or financial advice.

SAFEGUARDING (most important)
- If anyone says they or someone else is being hurt, is unsafe, or is thinking about harming themselves: respond kindly and calmly, don't ask probing questions, and don't promise to keep secrets. Encourage them to tell a trusted adult or leader now. Always give these, by name and number: in danger right now, call 999; Childline 0800 1111 (under 19, free, any time); Samaritans 116 123 (anyone, free, any time). They can also contact Destiny's Designated Safeguarding Lead via admin@destinytees.uk.

OFF-TOPIC
- Be generous about anything to do with Destiny, church life, or getting to and taking part in things here. Politely decline unrelated tasks (homework, coding, trivia, opinions on news or politics) in one line, and say what you can help with.

TOOLS
- find_events, share_event: the ChurchSuite calendar (see GROUNDING).
- find_sermons, get_weather (dates within 16 days), get_directions (Destiny Centre), find_products (the Destiny shop: mention names and prices only), search_web, extract_page.
- When a tool reports available: false, say that lookup isn't working right now.

────────────────────────────────────────────────────────
KNOWLEDGE

${CHURCH_FACTS}`;
}

// ── Context ─────────────────────────────────────────────────────────────────

type Turn = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/** One message as DestinyAI is shown it: "Name: text", with polls, events and files described. */
function describe(m: D1Message): string {
  const parts = [m.body?.trim(), contentPreview(m.content), m.attachment ? `[${m.attachment.mimeType.startsWith("image/") ? "photo" : m.attachment.mimeType.startsWith("audio/") ? "voice message" : "file"}]` : null];
  return parts.filter(Boolean).join(" ") || "[empty]";
}

/**
 * The asking message's reply chain in a group, oldest first, limited to what
 * the asker can see themselves. Read row by row through getMessage, which
 * opens the sealed text.
 */
async function replyChain(caller: Caller, asking: D1Message, joinedAt: string): Promise<D1Message[]> {
  const blocked = new Set(await blockedIds(caller.member.id));
  const chain: D1Message[] = [];
  let next = asking.replyTo;
  while (next && chain.length < REPLY_CHAIN) {
    const m = await getMessage(caller, next).catch(() => null);
    if (!m || m.groupId !== asking.groupId || m.deleted || m.createdAt < joinedAt) break;
    if (m.sender && blocked.has(m.sender.id)) break;
    chain.unshift(m);
    next = m.replyTo;
  }
  return chain;
}

async function groupTurns(caller: Caller, asking: D1Message, joinedAt: string): Promise<Turn[]> {
  const chain = await replyChain(caller, asking, joinedAt);
  const question = stripDestinyAIMention(asking.body ?? "") || "(They tagged you without a question.)";
  if (!chain.length) return [{ role: "user", content: `${caller.member.display_name}: ${question}` }];
  const shown = chain.map((m) => `${m.sender?.displayName ?? "Former member"}: ${describe(m)}`).join("\n");
  return [
    {
      role: "user",
      content: `The message(s) ${caller.member.first_name || caller.member.display_name} replied to, oldest first:\n${shown}\n\n${caller.member.display_name} asks: ${question}`,
    },
  ];
}

async function dmTurns(caller: Caller, groupId: string): Promise<Turn[]> {
  const page = await listMessages(caller, groupId, { limit: DM_HISTORY });
  return page.messages
    .filter((m) => !m.deleted)
    .map((m): Turn =>
      m.sender?.id === DESTINY_AI_ID
        ? { role: "assistant", content: m.body ?? describe(m) }
        : { role: "user", content: describe(m) },
    );
}

// ── The model ───────────────────────────────────────────────────────────────

/** Strips anything chat can't show: Smart Search's trailing OPTION/PAGE/CTA lines and markdown emphasis. */
function tidy(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*(OPTION|PAGE|CTA):/i.test(line))
    .join("\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_ANSWER_CHARS);
}

const DELTA_MS = 150;

const TOOL_LABELS: Record<string, string> = {
  find_events: "Checking the calendar",
  share_event: "Finding that event",
  find_products: "Looking in the shop",
  find_sermons: "Looking through sermons",
  get_weather: "Checking the weather",
  get_directions: "Getting directions",
  search_web: "Searching the web",
  extract_page: "Reading the page",
};

/**
 * Live updates to a group while DestinyAI works: what it's doing, and the text
 * so far. Sent over Realtime's REST broadcast, so nothing is stored. The
 * finished message replaces them when it lands. Text is throttled, and `done()`
 * waits for anything still on its way, so a stale update can't land after the answer.
 */
function liveUpdates(groupId: string) {
  const inFlight = new Set<Promise<void>>();
  const send = (event: string, payload: Record<string, unknown>) => {
    const p: Promise<void> = broadcastToGroup(groupId, event, { groupId, ...payload }).finally(() => inFlight.delete(p));
    inFlight.add(p);
  };
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest = "";
  const flushText = () => {
    timer = null;
    last = Date.now();
    send("assistant_delta", { text: latest });
  };
  return {
    status(label: string | null) {
      send("assistant_status", { label });
    },
    text(value: string) {
      latest = value;
      if (Date.now() - last >= DELTA_MS) flushText();
      else timer ??= setTimeout(flushText, DELTA_MS - (Date.now() - last));
    },
    async done() {
      if (timer) clearTimeout(timer);
      timer = null;
      await Promise.all(inFlight);
    },
  };
}

type Live = ReturnType<typeof liveUpdates>;

/** What the visitor should see while the answer is still arriving: no half-written PAGE/CTA line at the end. */
function displayText(raw: string): string {
  return tidy(raw).replace(/\n[A-Z]{0,5}$/, "");
}

/** One model turn, streamed. Text goes to `onText` as it arrives; tool calls are collected, not run. */
async function streamTurn(
  openai: OpenAI,
  convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  withTools: boolean,
  onText: (raw: string) => void,
): Promise<{ content: string; calls: { id: string; name: string; args: string }[] }> {
  const stream = await openai.chat.completions.create({
    model: SMART_SEARCH_MODEL,
    messages: convo,
    // On the last round, no more tools: it has to answer with what it has.
    ...(withTools ? { tools: [...EVENT_TOOLS, ...TOOL_DEFINITIONS], tool_choice: "auto" as const } : {}),
    max_tokens: 700,
    temperature: 0.3,
    stream: true,
  });
  let content = "";
  const calls = new Map<number, { id: string; name: string; args: string }>();
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;
    if (delta.content) {
      content += delta.content;
      onText(content);
    }
    for (const tc of delta.tool_calls ?? []) {
      const cur = calls.get(tc.index) ?? { id: "", name: "", args: "" };
      if (tc.id) cur.id = tc.id;
      if (tc.function?.name) cur.name += tc.function.name;
      if (tc.function?.arguments) cur.args += tc.function.arguments;
      calls.set(tc.index, cur);
    }
  }
  return { content, calls: [...calls.values()] };
}

async function generate(openai: OpenAI, system: string, turns: Turn[], live: Live): Promise<{ text: string; card: D1EventContent | null }> {
  const convo: Turn[] = [{ role: "system", content: system }, ...turns];
  const ctx: ToolContext = createToolContext();
  let card: D1EventContent | null = null;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const { content, calls } = await streamTurn(openai, convo, round < MAX_TOOL_ROUNDS, (raw) => live.text(displayText(raw)));
    if (!calls.length) return { text: tidy(content), card };

    convo.push({
      role: "assistant",
      content: content || null,
      tool_calls: calls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.args } })),
    });
    live.status(TOOL_LABELS[calls[0].name] ?? "Looking that up");

    const results = await Promise.all(
      calls.map(async (c) => {
        let data: unknown;
        try {
          const args = c.args ? JSON.parse(c.args) : {};
          if (c.name === "find_events") {
            data = await runFindEvents(args);
          } else if (c.name === "share_event") {
            if (card) data = { ok: false, reason: "An event is already attached." };
            else {
              card = await buildEventSnapshot({ slug: String(args.slug), seriesKey: String(args.series_key) }).catch(() => null);
              data = card ? { ok: true } : { ok: false, reason: "That event couldn't be found." };
            }
          } else {
            data = (await executeTool(c.name, c.args, ctx)).data;
          }
        } catch (err) {
          data = { available: false, reason: (err as Error).message };
        }
        return { role: "tool" as const, tool_call_id: c.id, content: JSON.stringify(data) };
      }),
    );
    convo.push(...results);
  }
  return { text: "", card };
}

// ── Posting ─────────────────────────────────────────────────────────────────

async function post(caller: Caller, groupId: string, inDm: boolean, text: string, card: D1EventContent | null, replyTo: number | null): Promise<void> {
  const body = text.trim() || null;
  const { data, error } = await createServiceClient().rpc("d1_post_assistant_message", {
    p_group: groupId,
    p_body: sealBody(body, groupId),
    p_reply_to: replyTo,
    p_content: sealContent(card, groupId),
    p_terms: messageTerms(body, groupId),
    // In a group the asker gets "DestinyAI mentioned you", even if they've muted it.
    p_mentions: inDm ? null : [caller.member.id],
  });
  if (error) {
    console.error("⚠️ DestinyAI couldn't post its answer:", error.message);
    return;
  }
  const message = await getMessage(caller, data as number);
  await Promise.all([
    broadcastNewMessage(message),
    pushNewMessage(groupId, DESTINY_AI_ID, { senderName: DESTINY_AI_NAME, body: body ?? contentPreview(card), attachmentMime: null }, message.mentions, message.id),
  ]);
}

/** Whether this newly sent message is a question for DestinyAI. */
export function asksDestinyAI(kind: D1GroupKind, message: D1Message): boolean {
  if (message.sender?.id === DESTINY_AI_ID) return false;
  return kind === "assistant" || mentionsDestinyAI(message.body);
}

/**
 * Answers `message` if it asks DestinyAI something. Call from after() once the
 * message has been sent. `joinedAt` is when the asker joined the group.
 */
export async function answer(caller: Caller, kind: D1GroupKind, joinedAt: string, message: D1Message): Promise<void> {
  if (!asksDestinyAI(kind, message)) return;
  const inDm = kind === "assistant";
  // In a group the answer is threaded under the question; in its own chat it doesn't need to be.
  const replyTo = inDm ? null : message.id;

  try {
    await limit("assistant", caller.member.id, PER_MINUTE);
  } catch {
    return post(caller, message.groupId, inDm, TOO_MANY, null, replyTo);
  }
  if (inDm && !message.body?.trim() && message.attachment) {
    return post(caller, message.groupId, inDm, TEXT_ONLY, null, replyTo);
  }

  const openai = getOpenAI();
  if (!openai) return post(caller, message.groupId, inDm, SORRY, null, replyTo);

  // "DestinyAI is typing…" in the header until the answer lands (the app shows it for a few seconds after each).
  const typing = () => broadcastToGroup(message.groupId, "typing", { groupId: message.groupId, memberId: DESTINY_AI_ID, name: DESTINY_AI_NAME });
  void typing();
  const timer = setInterval(() => void typing(), TYPING_EVERY_MS);
  // Live status and text for the bubble that stands in for the answer until it lands.
  const live = liveUpdates(message.groupId);
  live.status("Thinking");

  try {
    const [turns, group] = await Promise.all([
      inDm ? dmTurns(caller, message.groupId) : groupTurns(caller, message, joinedAt),
      createServiceClient().from("d1_groups").select("name").eq("id", message.groupId).maybeSingle(),
    ]);
    const where = inDm
      ? { kind: "dm" as const, firstName: caller.member.first_name || caller.member.display_name }
      : { kind: "group" as const, groupName: (group.data?.name as string | undefined) ?? "a group", askerName: caller.member.display_name };
    const { text, card } = await generate(openai, systemPrompt(where), turns, live);
    clearInterval(timer);
    await live.done();
    await post(caller, message.groupId, inDm, text || (card ? "" : SORRY), card, replyTo);
  } catch (err) {
    clearInterval(timer);
    console.error("⚠️ DestinyAI failed:", err);
    await live.done();
    await post(caller, message.groupId, inDm, SORRY, null, replyTo);
  }
}

/** The caller's chat with DestinyAI (made the first time). */
export async function assistantGroupId(caller: Caller): Promise<string> {
  const { data, error } = await createServiceClient().rpc("d1_assistant_group", { p_member: caller.member.id });
  if (error) throw fromDbError(error);
  return data as string;
}
