// Destiny One — the rules, as pure functions.
//
// The database is the authority (supabase/migrations/20260926_01_destiny_one.sql
// enforces every one of these in triggers and SQL functions). This copy exists
// so the BFF can refuse early with a clear message, and so the app can hide a
// button rather than show one that will fail. If the two ever disagree, the
// database wins and this file is the bug.

import type { D1AppConfig, D1Consent, D1LeaderRole, D1MemberStatus, D1MembershipRole, D1GroupKind, D1GroupState } from "./types";

/** No 1:1 chats: a "group" of two is a DM with extra steps. */
export const MIN_GROUP_MEMBERS = 3;
/** Safeguarding: never fewer than two verified adults in any group. */
export const MIN_GROUP_ADULTS = 2;
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

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

export function canCreateCommunity(m: PolicyMember): boolean {
  return isActive(m) && m.isAdult && m.roles.includes("senior_leadership");
}

export function canCreateGroup(m: PolicyMember): boolean {
  return (
    isActive(m) &&
    m.isAdult &&
    (m.roles.includes("group_leader") || m.roles.includes("senior_leadership"))
  );
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

// ── Notifications ───────────────────────────────────────────────────────────

/** How much of a message a push notification may carry. */
export const PUSH_PREVIEW_CHARS = 100;

export interface PushPreview {
  senderName: string;
  body: string | null;
  attachmentMime: string | null;
}

/** "Leah Simmons: Thanks Jonathan" — the first line only, cut to PUSH_PREVIEW_CHARS. */
export function pushPreviewText({ senderName, body, attachmentMime }: PushPreview): string {
  const firstLine = (body ?? "").trim().split(/\r?\n/)[0]?.trim() ?? "";
  let text: string;
  if (firstLine) {
    text = firstLine.length > PUSH_PREVIEW_CHARS ? `${firstLine.slice(0, PUSH_PREVIEW_CHARS - 1).trimEnd()}\u2026` : firstLine;
  } else if (attachmentMime) {
    text = attachmentMime.startsWith("image/") ? "Photo" : "File";
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
