// Destiny One — encryption at rest for chat text, wired to the real keys.
// The mechanics (and the why) are in sealing.ts; this file loads the keyring
// from env and knows which fields of a message are sealed:
//
//   • d1_messages.body                       purpose "msg"
//   • d1_messages.content poll question and option labels (ids stay plain:
//     d1_vote checks them in SQL). Event snapshots are public church events
//     and stay plain.
//   • d1_reports.reason                      purpose "report"
//
// Everything is keyed to the group the row belongs to.

import "server-only";
import type { D1MessageContent } from "@destiny/shared";
import { indexTerms, open, parseKeyring, seal, type Keyring, type SealPurpose } from "@/lib/destinyOne/sealing";

let ring: Keyring | null = null;

function keyring(): Keyring {
  ring ??= parseKeyring({
    keys: process.env.D1_MSG_KEYS,
    current: process.env.D1_MSG_KEY_CURRENT,
    search: process.env.D1_SEARCH_KEY,
  });
  return ring;
}

export { keyring as messageKeyring };

/** Shown in place of a value that won't open, so one bad row can't take down a whole chat. */
export const UNREADABLE = "This message couldn't be decrypted.";

function openOrPlaceholder(value: string, purpose: SealPurpose, groupId: string): string {
  try {
    return open(keyring(), value, purpose, groupId);
  } catch (err) {
    console.error(`🔐 Destiny One: a sealed ${purpose} in group ${groupId} would not open:`, (err as Error).message);
    return UNREADABLE;
  }
}

export function sealBody(body: string | null | undefined, groupId: string): string | null {
  return body ? seal(keyring(), body, "msg", groupId) : null;
}

export function openBody(body: string | null | undefined, groupId: string): string | null {
  return body ? openOrPlaceholder(body, "msg", groupId) : null;
}

export function sealReason(reason: string, groupId: string): string {
  return seal(keyring(), reason, "report", groupId);
}

export function openReason(reason: string | null | undefined, groupId: string): string | null {
  return reason ? openOrPlaceholder(reason, "report", groupId) : null;
}

function mapPollText(content: D1MessageContent, groupId: string, fn: (text: string, groupId: string) => string): D1MessageContent {
  if (content.kind !== "poll") return content;
  return {
    ...content,
    poll: {
      ...content.poll,
      question: fn(content.poll.question, groupId),
      options: content.poll.options.map((o) => ({ ...o, label: fn(o.label, groupId) })),
    },
  };
}

export function sealContent(content: D1MessageContent | null, groupId: string): D1MessageContent | null {
  return content ? mapPollText(content, groupId, (text, g) => seal(keyring(), text, "msg", g)) : null;
}

export function openContent(content: D1MessageContent | null | undefined, groupId: string): D1MessageContent | null {
  return content ? mapPollText(content, groupId, (text, g) => openOrPlaceholder(text, "msg", g)) : null;
}

/** Search-index terms for a message's body (search covers bodies only, as it did before encryption). */
export function messageTerms(body: string | null | undefined, groupId: string): string[] {
  return body ? indexTerms(keyring(), body, groupId) : [];
}
