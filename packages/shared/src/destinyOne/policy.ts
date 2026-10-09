// Destiny One — the rules, as pure functions.
//
// The database is the authority (supabase/migrations/20260926_01_destiny_one.sql
// enforces every one of these in triggers and SQL functions). This copy exists
// so the BFF can refuse early with a clear message, and so the app can hide a
// button rather than show one that will fail. If the two ever disagree, the
// database wins and this file is the bug.

import type { D1AppConfig, D1Consent, D1LeaderRole, D1MemberStatus, D1MembershipRole, D1GroupKind, D1GroupState, D1MessageContent, D1PollDraft } from "./types";

/** No 1:1 chats: a "group" of two is a DM with extra steps. */
export const MIN_GROUP_MEMBERS = 3;
/** Safeguarding: never fewer than two verified adults in any group. */
export const MIN_GROUP_ADULTS = 2;
export const MAX_MESSAGE_LENGTH = 4000;
/** "Report a problem" / "Send feedback" text (d1_feedback.body). */
export const MAX_FEEDBACK_LENGTH = 2000;
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

/** Voice notes: AAC in an .m4a file. Recorded in the app, never picked from Files. */
export const VOICE_MIME_TYPE = "audio/mp4";
/** Longest voice note, in milliseconds (d1_attachments enforces the same). */
export const MAX_VOICE_MS = 5 * 60 * 1000;
/** Everything that can be uploaded as an attachment. */
export const UPLOAD_MIME_TYPES = [...ATTACHMENT_MIME_TYPES, VOICE_MIME_TYPE] as const;

/**
 * The notices someone must accept before chat unlocks. Bump a version when the
 * wording changes materially and everyone is asked again.
 *
 * chat_review_notice is the plain statement that chats are not end-to-end
 * encrypted and can be reviewed by the safeguarding team — GDPR transparency,
 * and docs/mobile-app-scope.md §4.5.
 */
export const REQUIRED_CONSENTS: readonly D1Consent[] = [
  { document: "privacy", version: "2026-09" },
  { document: "terms", version: "2026-09" },
  { document: "chat_review_notice", version: "2026-09" },
];

export function outstandingConsents(accepted: readonly D1Consent[]): D1Consent[] {
  return REQUIRED_CONSENTS.filter(
    (req) => !accepted.some((a) => a.document === req.document && a.version === req.version),
  );
}

// ── Age ─────────────────────────────────────────────────────────────────────

/**
 * The 18th birthday for a date of birth (YYYY-MM-DD), as YYYY-MM-DD.
 *
 * This is all we store: the full DOB never leaves the ChurchSuite client.
 * Someone born on 29 February comes of age on 1 March in a non-leap year.
 * Returns null for anything that isn't a real calendar date, which callers
 * treat as "minor" — the fail-safe.
 */
export function adultOnFromDateOfBirth(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob.trim());
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const born = new Date(Date.UTC(year, month - 1, day));
  if (born.getUTCFullYear() !== year || born.getUTCMonth() !== month - 1 || born.getUTCDate() !== day) {
    return null;
  }
  // Date.UTC rolls 29 Feb into 1 Mar on its own in a non-leap target year.
  const adult = new Date(Date.UTC(year + 18, month - 1, day));
  return adult.toISOString().slice(0, 10);
}

/** The youngest age that can use Destiny One (decided 2026-09-28). No parent or carer step at 13+. */
export const MIN_AGE = 13;

/** The date someone born on `dob` (YYYY-MM-DD) turns MIN_AGE, or null for anything that isn't a real date. */
export function minimumAgeOn(dob: string | null | undefined): string | null {
  if (!dob || !adultOnFromDateOfBirth(dob)) return null;
  const [year, month, day] = dob.trim().slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year + MIN_AGE, month - 1, day)).toISOString().slice(0, 10);
}

/** True when a real date of birth makes someone younger than MIN_AGE on `today` (YYYY-MM-DD). */
export function isUnderMinimumAge(dob: string | null | undefined, today: string): boolean {
  const on = minimumAgeOn(dob);
  return on !== null && on > today;
}

export const UNDER_MINIMUM_AGE_MESSAGE = `Destiny One is for people aged ${MIN_AGE} and over.`;

/**
 * Today in the church's time zone, as YYYY-MM-DD. The database compares against
 * its own current_date (UTC on Supabase), so the two can disagree for an hour
 * around midnight on someone's 18th birthday — harmless, since the database's
 * answer is the one that's enforced.
 */
export function todayInLondon(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isAdult(adultOn: string | null | undefined, today: string = todayInLondon()): boolean {
  return Boolean(adultOn) && (adultOn as string) <= today;
}

// ── Who can do what ─────────────────────────────────────────────────────────

export interface PolicyMember {
  status: D1MemberStatus;
  roles: readonly D1LeaderRole[];
  isAdult: boolean;
}

export function isActive(m: PolicyMember): boolean {
  return m.status === "active";
}

/** Tag text for each account role. */
export const D1_ROLE_LABELS: Record<D1LeaderRole, string> = {
  admin: "Admin",
  senior_leader: "Senior Leader",
  cg_leader: "CG Leader",
};

/** Highest first: whoever holds several roles shows the first one that matches. */
const ROLE_PRECEDENCE: readonly D1LeaderRole[] = ["admin", "senior_leader", "cg_leader"];

/** The role shown as someone's tag, or null if they hold none. */
export function topRole(roles: readonly D1LeaderRole[]): D1LeaderRole | null {
  return ROLE_PRECEDENCE.find((r) => roles.includes(r)) ?? null;
}

/** Any of the three roles makes someone a leader; they all have the same powers. */
export function isLeaderRole(roles: readonly D1LeaderRole[]): boolean {
  return topRole(roles) !== null;
}

export function canCreateCommunity(m: PolicyMember): boolean {
  return isActive(m) && m.isAdult && isLeaderRole(m.roles);
}

export function canCreateGroup(m: PolicyMember): boolean {
  return isActive(m) && m.isAdult && isLeaderRole(m.roles);
}

export interface GroupComposition {
  members: number;
  adults: number;
}

export type RuleCheck = { ok: true } | { ok: false; reason: string };

/** Would a group with these people satisfy the rules? */
export function checkComposition({ members, adults }: GroupComposition): RuleCheck {
  if (members < MIN_GROUP_MEMBERS) {
    return { ok: false, reason: "A group needs at least 3 people. There are no one-to-one chats." };
  }
  if (adults < MIN_GROUP_ADULTS) {
    return { ok: false, reason: "A group needs at least 2 verified adults." };
  }
  return { ok: true };
}

export function canPost(input: {
  member: PolicyMember;
  groupKind: D1GroupKind;
  groupState: D1GroupState;
  myRole: D1MembershipRole | null;
}): boolean {
  if (!isActive(input.member) || input.myRole === null) return false;
  if (input.groupState !== "active") return false;
  if (input.groupKind === "announcements") return input.myRole === "admin";
  return true;
}

/** Group admins moderate, so they must be adults. */
export function canBeGroupAdmin(m: PolicyMember): boolean {
  return isActive(m) && m.isAdult;
}

export function validateMessageBody(body: string | null | undefined, hasAttachment: boolean): RuleCheck {
  const text = (body ?? "").trim();
  if (!text && !hasAttachment) return { ok: false, reason: "A message can't be empty." };
  if (text.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, reason: `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.` };
  }
  return { ok: true };
}

// ── Polls ────────────────────────────────────────────────────────────────────

/** How long after sending a message its text can still be edited (d1_edit_message enforces the same). */
export const EDIT_WINDOW_MINUTES = 15;
/** How many times one message can be edited. */
export const MAX_EDITS = 10;

/** Whether the app should offer Edit: your own sent text, not deleted, still inside the window. */
export function canEditMessage(m: { mine: boolean; deleted: boolean; body: string | null; id: number; createdAt: string }, now: number = Date.now()): boolean {
  return m.mine && !m.deleted && m.id > 0 && !!m.body && now - Date.parse(m.createdAt) < EDIT_WINDOW_MINUTES * 60_000;
}

// ── Mentions ────────────────────────────────────────────────────────────────
// "@Leah Simmons" in the text, plus the member ids alongside (the server only
// keeps ids of current members of the group). Names are matched whole, longest
// first, so "@Leah Simmons" never counts as "@Leah" too.

export interface Mentionable {
  id: string;
  displayName: string;
}

function isNameChar(ch: string | undefined): boolean {
  return !!ch && /[\p{L}\p{N}'’-]/u.test(ch);
}

/** Where each "@Name" from `people` sits in `text` (non-overlapping, in order). */
function findMentionSpans(text: string, people: readonly Mentionable[]): { start: number; end: number; person: Mentionable }[] {
  const byLength = [...people].filter((p) => p.displayName.trim()).sort((a, b) => b.displayName.length - a.displayName.length);
  const spans: { start: number; end: number; person: Mentionable }[] = [];
  for (let i = text.indexOf("@"); i >= 0; i = text.indexOf("@", i + 1)) {
    if (i > 0 && isNameChar(text[i - 1])) continue; // an email address, not a mention
    if (spans.some((s) => i >= s.start && i < s.end)) continue;
    const hit = byLength.find((p) => text.startsWith(p.displayName, i + 1) && !isNameChar(text[i + 1 + p.displayName.length]));
    if (hit) spans.push({ start: i, end: i + 1 + hit.displayName.length, person: hit });
  }
  return spans;
}

/** The ids of the people mentioned in `text`, once each. */
export function findMentions(text: string, people: readonly Mentionable[]): string[] {
  return [...new Set(findMentionSpans(text, people).map((s) => s.person.id))];
}

/** `text` cut into plain runs and mentions, for drawing mentions in bold. */
export function mentionSegments(text: string, people: readonly Mentionable[]): { text: string; mention: Mentionable | null }[] {
  const out: { text: string; mention: Mentionable | null }[] = [];
  let at = 0;
  for (const s of findMentionSpans(text, people)) {
    if (s.start > at) out.push({ text: text.slice(at, s.start), mention: null });
    out.push({ text: text.slice(s.start, s.end), mention: s.person });
    at = s.end;
  }
  if (at < text.length) out.push({ text: text.slice(at), mention: null });
  return out;
}

/**
 * While typing: the "@…" being written just before the cursor, if any, so
 * the composer can suggest people. `start` is the index of the "@".
 */
export function mentionQuery(text: string, cursor: number): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf("@");
  if (at < 0 || (at > 0 && isNameChar(before[at - 1]))) return null;
  const query = before.slice(at + 1);
  if (query.length > 30 || /[\n@]/.test(query) || /\s{2}/.test(query) || /^\s/.test(query)) return null;
  return { start: at, query };
}

/** People whose name matches what's been typed after "@" (any word's start), up to `limit`. */
export function mentionSuggestions(query: string, people: readonly Mentionable[], limit = 5): Mentionable[] {
  const q = query.trim().toLowerCase();
  return people
    .filter((p) => !q || p.displayName.toLowerCase().startsWith(q) || p.displayName.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)))
    .slice(0, limit);
}

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 6;
export const MAX_POLL_QUESTION_LENGTH = 200;
export const MAX_POLL_OPTION_LENGTH = 80;

export function validatePoll(draft: D1PollDraft): RuleCheck {
  const question = draft.question.trim();
  if (!question) return { ok: false, reason: "Add a question." };
  if (question.length > MAX_POLL_QUESTION_LENGTH) {
    return { ok: false, reason: `Questions can be up to ${MAX_POLL_QUESTION_LENGTH} characters.` };
  }
  const options = draft.options.map((o) => o.trim()).filter(Boolean);
  if (options.length < MIN_POLL_OPTIONS) {
    return { ok: false, reason: `Add at least ${MIN_POLL_OPTIONS} options.` };
  }
  if (options.length > MAX_POLL_OPTIONS) {
    return { ok: false, reason: `Polls can have up to ${MAX_POLL_OPTIONS} options.` };
  }
  if (options.some((o) => o.length > MAX_POLL_OPTION_LENGTH)) {
    return { ok: false, reason: `Options can be up to ${MAX_POLL_OPTION_LENGTH} characters.` };
  }
  return { ok: true };
}

// ── Notifications ───────────────────────────────────────────────────────────

/** How much of a message a push notification may carry. */
export const PUSH_PREVIEW_CHARS = 100;

export interface PushPreview {
  senderName: string;
  body: string | null;
  attachmentMime: string | null;
}

/**
 * What stands in for the text of a poll or a shared event, which have no body
 * of their own: "Poll: Pizza or curry?", "Event: Youth Night". Used wherever a
 * message is summarised in one line (chat list, notifications, reply quotes).
 * Null for anything else.
 */
export function contentPreview(content: D1MessageContent | null | undefined): string | null {
  if (content?.kind === "poll") return `Poll: ${content.poll.question}`;
  if (content?.kind === "event") return `Event: ${content.event.name}`;
  return null;
}

/** "Leah Simmons: Thanks Jonathan" — the first line only, cut to PUSH_PREVIEW_CHARS. */
export function pushPreviewText({ senderName, body, attachmentMime }: PushPreview): string {
  const firstLine = (body ?? "").trim().split(/\r?\n/)[0]?.trim() ?? "";
  let text: string;
  if (firstLine) {
    text = firstLine.length > PUSH_PREVIEW_CHARS ? `${firstLine.slice(0, PUSH_PREVIEW_CHARS - 1).trimEnd()}\u2026` : firstLine;
  } else if (attachmentMime) {
    text = attachmentMime.startsWith("image/") ? "Photo" : attachmentMime.startsWith("audio/") ? "Voice message" : "File";
  } else {
    text = "New message";
  }
  return `${senderName}: ${text}`;
}

// ── Search ──────────────────────────────────────────────────────────────────

/** Minimum characters before message search runs. */
export const MIN_SEARCH_CHARS = 2;

/**
 * Typed words → a Postgres prefix tsquery: "Run  sheet!" → "run:* & sheet:*".
 * Letters and digits only, so nothing typed can change the query's meaning.
 * Null when there's nothing to search for.
 */
export function toPrefixQuery(input: string): string | null {
  const words = input
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
  if (!words.length || words.join("").length < MIN_SEARCH_CHARS) return null;
  return words.map((w) => `${w}:*`).join(" & ");
}

export type D1AppGate = "ok" | "update" | "maintenance";

/**
 * Whether this build of the app may run. `build` is the native build number
 * (null in Expo Go, dev clients without one, and on web: always allowed, so a
 * developer is never locked out). Maintenance beats everything, since it means
 * "nobody, whatever their build".
 */
export function appGate(config: D1AppConfig | null | undefined, platform: string, build: number | null): D1AppGate {
  if (!config) return "ok";
  if (config.maintenanceMessage) return "maintenance";
  if (build === null || !Number.isFinite(build)) return "ok";
  const min = platform === "ios" ? config.minBuild.ios : platform === "android" ? config.minBuild.android : 1;
  return build < min ? "update" : "ok";
}

/** A member may change their own name this many times in any rolling 30 days. */
export const NAME_CHANGES_PER_MONTH = 2;
const NAME_CHANGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Where a member stands on changing their name. `log` is every time they've
 * changed it (ISO timestamps, any order). Only the last 30 days count; when
 * the allowance is used up, `nextAt` is when the oldest counted change ages out.
 */
export function nameChangeAllowance(log: readonly string[] | null | undefined, now: Date = new Date()): { left: number; nextAt: string | null } {
  const since = now.getTime() - NAME_CHANGE_WINDOW_MS;
  const recent = (log ?? []).map((t) => new Date(t).getTime()).filter((t) => Number.isFinite(t) && t > since).sort((a, b) => a - b);
  const left = Math.max(0, NAME_CHANGES_PER_MONTH - recent.length);
  if (left > 0) return { left, nextAt: null };
  return { left: 0, nextAt: new Date(recent[recent.length - NAME_CHANGES_PER_MONTH] + NAME_CHANGE_WINDOW_MS).toISOString() };
}
