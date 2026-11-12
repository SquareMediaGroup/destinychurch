// Destiny One — a message's stored verse card, opened (d1_messages.verse_ref).
// Its own module because both the message reader (chat.server.ts) and the Bible
// connection (bible.server.ts) need it, and bible.server imports chat.server.

import "server-only";
import { isPassageId, passageLabel, type D1VerseRef } from "@destiny/shared";
import { openBody, UNREADABLE } from "@/lib/destinyOne/crypto.server";

/** A message's stored verse card, opened. */
export function openVerseRef(sealed: string | null, groupId: string): D1VerseRef | null {
  const json = openBody(sealed, groupId);
  if (!json || json === UNREADABLE) return null;
  try {
    const v = JSON.parse(json) as { passageId?: string; bibleId?: number };
    if (!v.passageId || !isPassageId(v.passageId) || !Number.isInteger(v.bibleId)) return null;
    return { passageId: v.passageId, bibleId: v.bibleId!, label: passageLabel(v.passageId) ?? v.passageId };
  } catch {
    return null;
  }
}

