// Destiny One — encryption at rest for chat text (the pure half).
//
// Message bodies, poll wording and report reasons are sealed by the API before
// they reach Supabase and opened on the way out, so a database dump, a backup,
// SQL access or a leaked service key on its own shows only ciphertext. This is
// NOT end-to-end encryption: the API holds the key, which is what keeps
// safeguarding review, search and push previews working. See "Message
// encryption" in REPOSITORY_DOCUMENTATION.md for the threat model.
//
// Kept free of env and `server-only` so the unit tests can drive it with a
// throwaway keyring; crypto.server.ts loads the real one.
//
// Wire format (a plain string, so it passes through PostgREST and jsonb):
//
//   d1e:<keyId>:<iv>.<ciphertext + 16-byte GCM tag>      (both base64url)
//
// AES-256-GCM, fresh 12-byte IV per value. The additional authenticated data
// is "<purpose>:<groupId>", so a sealed value only opens in the group (and as
// the kind of thing) it was written for: copying a body into another group's
// row, or a report reason into a message, makes it fail to open.

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

export const SEALED_PREFIX = "d1e:";

export type SealPurpose = "msg" | "report";

export interface Keyring {
  /** Key id new values are sealed with. */
  current: string;
  /** Every key that may still be needed to open old values, by id. */
  keys: Map<string, Buffer>;
  /** HMAC key for the search index. Never used for encryption. */
  searchKey: Buffer;
}

/** Search terms are HMACs of word prefixes up to this many characters. */
export const MAX_TERM_CHARS = 24;
/** Bytes of each HMAC kept as the term (hex in the database). */
const TERM_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function decodeKey(b64: string, what: string): Buffer {
  const key = Buffer.from(b64.trim(), "base64");
  if (key.length !== 32) throw new Error(`${what} must be 32 bytes, base64-encoded (openssl rand -base64 32).`);
  return key;
}

/**
 * Builds a keyring from the three env values:
 *   D1_MSG_KEYS        "v1:<base64>" or "v1:<base64>,v2:<base64>" during a rotation
 *   D1_MSG_KEY_CURRENT "v2"
 *   D1_SEARCH_KEY      "<base64>"
 * Throws on anything missing or malformed: there is no plaintext fallback.
 */
export function parseKeyring(env: { keys?: string; current?: string; search?: string }): Keyring {
  if (!env.keys || !env.current || !env.search) {
    throw new Error("Destiny One message encryption keys are not configured (D1_MSG_KEYS, D1_MSG_KEY_CURRENT, D1_SEARCH_KEY).");
  }
  const keys = new Map<string, Buffer>();
  for (const entry of env.keys.split(",").map((s) => s.trim()).filter(Boolean)) {
    const at = entry.indexOf(":");
    const id = entry.slice(0, at);
    if (at < 1 || !/^[a-z0-9]+$/i.test(id)) throw new Error("D1_MSG_KEYS entries look like v1:<base64 key>.");
    keys.set(id, decodeKey(entry.slice(at + 1), `D1_MSG_KEYS ${id}`));
  }
  if (!keys.has(env.current)) throw new Error(`D1_MSG_KEY_CURRENT (${env.current}) is not in D1_MSG_KEYS.`);
  return { current: env.current, keys, searchKey: decodeKey(env.search, "D1_SEARCH_KEY") };
}

export function isSealed(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(SEALED_PREFIX);
}

function aad(purpose: SealPurpose, groupId: string): Buffer {
  return Buffer.from(`${purpose}:${groupId}`, "utf8");
}

export function seal(ring: Keyring, text: string, purpose: SealPurpose, groupId: string): string {
  const key = ring.keys.get(ring.current)!;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(purpose, groupId));
  const sealed = Buffer.concat([cipher.update(text, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return `${SEALED_PREFIX}${ring.current}:${iv.toString("base64url")}.${sealed.toString("base64url")}`;
}

/**
 * Opens a sealed value. Anything that isn't sealed comes back unchanged: that
 * only happens for rows written before the backfill, and the database refuses
 * new plaintext once migration 20261004_02 has run. A sealed value that won't
 * open (wrong group, tampered, unknown key) throws.
 */
export function open(ring: Keyring, value: string, purpose: SealPurpose, groupId: string): string {
  if (!isSealed(value)) return value;
  const rest = value.slice(SEALED_PREFIX.length);
  const colon = rest.indexOf(":");
  const dot = rest.indexOf(".", colon);
  const key = colon > 0 ? ring.keys.get(rest.slice(0, colon)) : undefined;
  if (!key || dot < 0) throw new Error("Can't open this message: unknown key or bad format.");
  const iv = Buffer.from(rest.slice(colon + 1, dot), "base64url");
  const sealed = Buffer.from(rest.slice(dot + 1), "base64url");
  if (iv.length !== IV_BYTES || sealed.length < TAG_BYTES) throw new Error("Can't open this message: bad format.");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(aad(purpose, groupId));
  decipher.setAuthTag(sealed.subarray(sealed.length - TAG_BYTES));
  return Buffer.concat([decipher.update(sealed.subarray(0, sealed.length - TAG_BYTES)), decipher.final()]).toString("utf8");
}

// ── Search index ────────────────────────────────────────────────────────────
// The database can't search ciphertext, so each message also gets a set of
// "terms": an HMAC of every prefix of every word (so "pra" finds "prayer").
// The HMAC key is derived per group, so the same word gives different terms in
// different groups and can't be counted across the whole database.

/** Words as the search box sees them: same split as toPrefixQuery in @destiny/shared. */
export function searchWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function groupSearchKey(ring: Keyring, groupId: string): Buffer {
  return createHmac("sha256", ring.searchKey).update(`d1-search:${groupId}`).digest();
}

function term(groupKey: Buffer, prefix: string): string {
  return createHmac("sha256", groupKey).update(prefix, "utf8").digest().subarray(0, TERM_BYTES).toString("hex");
}

/** Prefixes are cut by code point, not UTF-16 unit, so an emoji or accented letter is never split. */
function prefixOf(word: string, n: number): string {
  return Array.from(word).slice(0, n).join("");
}

/** Every term to store for a message's text. */
export function indexTerms(ring: Keyring, text: string, groupId: string): string[] {
  const groupKey = groupSearchKey(ring, groupId);
  const terms = new Set<string>();
  for (const word of new Set(searchWords(text))) {
    const length = Math.min(Array.from(word).length, MAX_TERM_CHARS);
    for (let n = 1; n <= length; n++) terms.add(term(groupKey, prefixOf(word, n)));
  }
  return [...terms];
}

/** One term per search word (all must match). Words longer than the index keeps are cut to fit. */
export function queryTerms(ring: Keyring, words: string[], groupId: string): string[] {
  const groupKey = groupSearchKey(ring, groupId);
  return [...new Set(words.map((w) => term(groupKey, prefixOf(w, MAX_TERM_CHARS))))];
}
