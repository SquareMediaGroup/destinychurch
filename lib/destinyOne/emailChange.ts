// Destiny One — the pure half of changing your sign-in email: the sealed
// ticket that ties a 6-digit code to one account and one new address. No
// network, so it's unit-tested directly (tests/unit/destiny-one-email-change.spec.ts).
// The network half is emailChange.server.ts.

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { seal, unseal } from "./churchsuite";

export const TICKET_TTL_SECONDS = 15 * 60;

interface Ticket extends Record<string, unknown> {
  uid: string;
  email: string;
  hash: string;
}

const codeHash = (uid: string, email: string, code: string) =>
  createHash("sha256").update(`${uid}:${email}:${code}`).digest("hex");

export function newEmailCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** A ticket for `uid` moving to `email`, good with `code` for TICKET_TTL_SECONDS. */
export function issueTicket(uid: string, email: string, code: string, secret: string, ttlSeconds = TICKET_TTL_SECONDS): string {
  return seal({ uid, email, hash: codeHash(uid, email, code) } satisfies Ticket, secret, ttlSeconds);
}

export type TicketCheck = { ok: true; email: string } | { ok: false; reason: "expired" | "wrong_code" };

/** Expired, forged, or another account's ticket all read as "expired"; only a live ticket can say the code is wrong. */
export function checkTicket(ticket: string, uid: string, code: string, secret: string): TicketCheck {
  const t = unseal<Ticket>(ticket, secret);
  if (!t || t.uid !== uid || typeof t.email !== "string" || typeof t.hash !== "string") return { ok: false, reason: "expired" };
  const expected = Buffer.from(t.hash);
  const given = Buffer.from(codeHash(uid, t.email, code));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "wrong_code" };
  return { ok: true, email: t.email };
}
