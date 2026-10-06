// Destiny One — encryption at rest for chat text, wired to the real keys.
// The mechanics (and the why) are in sealing.ts; this file loads the keyring
// and knows which fields of a message are sealed:
//
//   • d1_messages.body                       purpose "msg"
//   • d1_messages.content poll question and option labels (ids stay plain:
//     d1_vote checks them in SQL). Event snapshots are public church events
//     and stay plain.
//   • d1_reports.reason                      purpose "report"
//
// Everything is keyed to the group the row belongs to.

//
// Where the keys live: Supabase Vault (decided 2026-10-06, replacing Vercel
// env variables). They were generated inside the database and are only ever
// handed out by d1_message_keyring(), which only the service role can call
// (migration 20261006_00). The trade-off, accepted: a dump or backup on its
// own still shows only ciphertext, but someone with full SQL access or the
// service key could fetch the keys too.
//
// The env variables D1_MSG_KEYS / D1_MSG_KEY_CURRENT / D1_SEARCH_KEY are only
// a fallback for local development against a database without the Vault
// secrets. Vault always wins, so every server seals with the same keys.

import "server-only";
import type { D1MessageContent } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { indexTerms, open, parseKeyring, seal, type Keyring, type SealPurpose } from "@/lib/destinyOne/sealing";

/** Re-read the keys this often, so a rotation reaches every running server. */
const KEYRING_TTL_MS = 10 * 60 * 1000;

let ring: Keyring | null = null;
let loadedAt = 0;
let loading: Promise<Keyring> | null = null;

async function fetchKeyring(): Promise<Keyring> {
  const { data, error } = await createServiceClient().rpc("d1_message_keyring");
  const vault = (data ?? null) as { keys?: string | null; current?: string | null; search?: string | null } | null;
  if (!error && vault?.keys) {
    return parseKeyring({ keys: vault.keys ?? undefined, current: vault.current ?? undefined, search: vault.search ?? undefined });
  }
  if (process.env.D1_MSG_KEYS) {
    return parseKeyring({ keys: process.env.D1_MSG_KEYS, current: process.env.D1_MSG_KEY_CURRENT, search: process.env.D1_SEARCH_KEY });
  }
  throw new Error(`Destiny One message encryption keys are unavailable (${error?.message ?? "no Vault secrets"}).`);
}

/**
 * Loads (or refreshes) the keyring. Every Destiny One route awaits this before
 * it runs (oneRoute, and the safeguarding routes), so the sync helpers below
 * can rely on it. Cheap after the first call.
 */
export async function loadMessageKeyring(): Promise<Keyring> {
  if (ring && Date.now() - loadedAt < KEYRING_TTL_MS) return ring;
  loading ??= fetchKeyring()
    .then((r) => {
      ring = r;
      loadedAt = Date.now();
      return r;
    })
    .finally(() => {
      loading = null;
    });
  // A stale keyring keeps working while the refresh runs; only the first load waits.
  if (ring) {
    loading.catch((err) => console.error("🔐 Destiny One keyring refresh failed:", (err as Error).message));
    return ring;
  }
  return loading;
}

function keyring(): Keyring {
  if (!ring) throw new Error("Destiny One message keys aren't loaded yet: await loadMessageKeyring() first.");
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
