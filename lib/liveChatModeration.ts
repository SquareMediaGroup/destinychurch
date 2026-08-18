// What a guest is allowed to say in the live chat, and what happens when they
// say something else.
//
// This is a public, pseudonymous room under a church livestream and there is no
// way to know who is watching — so the rules here are deliberately blunt. Three
// outcomes, in order of severity:
//
//   allow  — goes straight onto the channel
//   hold   — stored, shown to its author and to Hosts, invisible to everyone
//            else until a Host approves it
//   reject — never stored; the sender is told why
//
// Holding rather than rejecting on the word filter is the deliberate choice: a
// rejected message tells the sender exactly which word to work around, and a
// filter you can probe is a filter you can beat. A held one just goes quiet.
//
// Everything here is pure — no I/O, no database — so tests/unit can exercise the
// rules directly.

export type Verdict =
  | { action: "allow"; body: string }
  | { action: "hold"; body: string; reason: string }
  | { action: "reject"; reason: string };

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_NAME_LENGTH = 24;
export const MIN_NAME_LENGTH = 2;

// Zero-width and bidi control characters. These are how a filter gets walked
// through: "b<zwsp>adword" reads identically to a human and differently to a
// regex. Stripped before anything else runs.
const INVISIBLE = /[​-‏‪-‮⁠-⁤﻿]/g;

const URL_LIKE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co\.uk|net|org|io|me|ly|xyz|link|gg|tv)\b)/i;
const EMAIL_LIKE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// UK mobile/landline shapes, and anything else that is mostly digits and spacing.
const PHONE_LIKE = /(?:\+?\d[\d\s().-]{8,}\d)/;

// Words that hold a message for review. Kept short and obvious on purpose: this
// is a safety net under a Host, not a substitute for one. Each becomes an
// anchored pattern in wordPattern() below, so "class" and "Scunthorpe" don't
// trip on a substring.
const HOLD_WORDS = [
  // profanity
  "fuck", "shit", "bitch", "bastard", "cunt", "wanker", "prick", "dickhead",
  "arsehole", "twat", "slut", "whore",
  // slurs and hate — held, never auto-published
  "nigger", "nigga", "faggot", "fag", "tranny", "retard", "paki", "kike", "spic",
  // sexual content
  "porn", "nude", "nudes", "horny", "sex", "xxx", "onlyfans",
  // self-harm and violence: held so a Host sees it fast, because the right
  // response to these is a person, not a delete button
  "kill myself", "killing myself", "kys", "suicide", "self harm", "end my life",
  "want to die", "hang myself",
  // scams that follow any public chat around
  "crypto", "bitcoin", "investment", "forex", "telegram", "whatsapp me",
  "make money fast", "click here", "free money",
];

// Names nobody may wear. A guest calling themselves "Host" or "Pastor Dave" in a
// room where the HOST badge means something is impersonation, whatever they
// meant by it.
const RESERVED_NAME_WORDS = [
  "host", "admin", "administrator", "moderator", "mod", "pastor", "ps",
  "reverend", "rev", "bishop", "elder", "leader", "staff", "official",
  "destiny", "destinychurch", "church", "support", "system", "server",
];

/** Lowercase, drop invisibles, and fold the usual letter-for-symbol swaps. */
function foldLeet(text: string): string {
  return text
    .toLowerCase()
    .replace(INVISIBLE, "")
    .replace(/[4@]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
}

// Characters people wedge between letters to walk a word past a plain substring
// match: "f.u.c.k", "f u c k", "f-u-c-k".
const SEPARATOR = "[\\s\\W_]*";

function escapeForRegex(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A pattern matching one blocked word, tolerating separators between its
 * letters but still anchored on word boundaries at both ends.
 *
 * The boundaries are the whole point, and the reason this isn't a substring
 * check. "Scunthorpe" contains a slur; so do "classic", "analysis" and a long
 * tail of ordinary words. A filter that holds those is a filter the church turns
 * off within a week, which leaves the room unmoderated — so precision here is a
 * safety feature, not a nicety.
 */
function wordPattern(word: string): RegExp {
  const letters = word.replace(/\s+/g, "").split("").map(escapeForRegex);
  return new RegExp(`\\b${letters.join(SEPARATOR)}\\b`);
}

// Built once at module load rather than per message.
const HOLD_PATTERNS = HOLD_WORDS.map((word) => ({ word, re: wordPattern(word) }));
const RESERVED_NAME_PATTERNS = RESERVED_NAME_WORDS.map((word) => wordPattern(word));

/** Trim, strip invisibles, collapse runs of whitespace and repeated characters. */
export function normaliseBody(raw: string): string {
  return raw
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    // "yessssssss" → "yesss". Stops shout-walls without rejecting enthusiasm.
    .replace(/(.)\1{3,}/g, "$1$1$1")
    .trim();
}

function matchedHoldWord(text: string): string | null {
  const folded = foldLeet(text);
  for (const { word, re } of HOLD_PATTERNS) {
    if (re.test(folded)) return word;
  }
  return null;
}

/**
 * Run a guest message through the rules.
 *
 * Hosts skip this entirely (they may post links, and they are accountable to a
 * real login), which is why `authorKind` is a parameter rather than an
 * assumption.
 */
export function screenMessage(
  raw: string,
  authorKind: "guest" | "host" = "guest",
): Verdict {
  const body = normaliseBody(raw ?? "");

  if (!body) return { action: "reject", reason: "Type a message first." };
  if (body.length > MAX_MESSAGE_LENGTH) {
    return {
      action: "reject",
      reason: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  if (authorKind === "host") return { action: "allow", body };

  // Contact details and links, out. This is the single highest-value rule for a
  // room that minors may be in: it removes the "message me somewhere private"
  // move entirely, and it kills link spam as a side effect.
  if (URL_LIKE.test(body)) {
    return { action: "reject", reason: "Links aren't allowed in the chat." };
  }
  if (EMAIL_LIKE.test(body)) {
    return { action: "reject", reason: "Please don't share email addresses here." };
  }
  if (PHONE_LIKE.test(body)) {
    return { action: "reject", reason: "Please don't share phone numbers here." };
  }

  const hit = matchedHoldWord(body);
  if (hit) {
    return {
      action: "hold",
      body,
      // Stored for the Host's queue, never returned to the sender.
      reason: `matched "${hit}"`,
    };
  }

  return { action: "allow", body };
}

export type NameVerdict = { ok: true; name: string } | { ok: false; reason: string };

export function screenDisplayName(raw: string): NameVerdict {
  const name = (raw ?? "").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();

  if (name.length < MIN_NAME_LENGTH) {
    return { ok: false, reason: "Please use at least 2 characters." };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, reason: `Names are limited to ${MAX_NAME_LENGTH} characters.` };
  }
  if (URL_LIKE.test(name) || EMAIL_LIKE.test(name)) {
    return { ok: false, reason: "Names can't contain links or email addresses." };
  }
  if (!/^[\p{L}\p{N} '._-]+$/u.test(name)) {
    return { ok: false, reason: "Please use letters, numbers, spaces, apostrophes or hyphens." };
  }
  if (matchedHoldWord(name)) {
    return { ok: false, reason: "Please choose a different name." };
  }

  const folded = foldLeet(name);
  if (RESERVED_NAME_PATTERNS.some((re) => re.test(folded))) {
    return {
      ok: false,
      reason: "That name is reserved for the church team. Please choose another.",
    };
  }

  return { ok: true, name };
}

// ── Rate limiting ───────────────────────────────────────────────────────────
// Same shape as lib/loginRateLimit.ts, with the same caveat: this is an
// in-memory Map, so on Vercel it is per-lambda-instance and a determined
// flooder spread across instances gets more through than these numbers suggest.
// It stops the ordinary case — someone leaning on the enter key — which is what
// it is for. If it ever stops being enough, the counter belongs in Postgres,
// not in bigger numbers here.

const BURST_MS = 3_000; // one message per 3s
const WINDOW_MS = 5 * 60 * 1000;
const WINDOW_MAX = 15; // …and 15 per 5 minutes

interface Entry {
  last: number;
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, WINDOW_MS).unref?.();

export function checkChatRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { last: now, count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (now - entry.last < BURST_MS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((BURST_MS - (now - entry.last)) / 1000),
    };
  }

  if (entry.count >= WINDOW_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.last = now;
  entry.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test seam — the limiter is module state, so unit tests need a way to reset it. */
export function resetChatRateLimit(key?: string) {
  if (key) store.delete(key);
  else store.clear();
}
