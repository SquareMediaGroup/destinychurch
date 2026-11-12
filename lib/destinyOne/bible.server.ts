// Destiny One — the Bible connection (server half). See
// packages/shared/src/destinyOne/bible.ts for references, and migration
// 20261113_01_destiny_one_bible.sql for what is stored and why.
//
// Our API is the only thing that talks to YouVersion (https://api.youversion.com/v1,
// the app key in the X-YVP-App-Key header). The app never does, so the key stays
// secret and YouVersion only ever learns which passage of which Bible: never who
// asked. Passages are cached for everyone (d1_bible_passages) to stay under the
// platform's hourly limit; the verse of the day is fetched once a day.
//
// Without YOUVERSION_APP_KEY (before the church has registered) everything here
// answers "unavailable", and the app shows "Couldn't load this verse" with a
// link to read it in the Bible App, as it does when YouVersion is down.

import "server-only";
import { bibleWebUrl, findReference, isPassageId, passageLabel, type D1Passage, type D1VerseRef } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { broadcastToGroup } from "@/lib/destinyOne/chat.server";
import { sealBody } from "@/lib/destinyOne/crypto.server";

const API = (process.env.YOUVERSION_API_URL || "https://api.youversion.com/v1").replace(/\/$/, "");
const TIMEOUT_MS = 6000;
/** How long fetched words are kept. Set D1_BIBLE_CACHE_HOURS from the publisher's licence (see the scope doc). */
const CACHE_MS = (() => {
  const h = Number(process.env.D1_BIBLE_CACHE_HOURS);
  return (Number.isFinite(h) && h > 0 ? h : 24) * 3_600_000;
})();
const VERSION_CACHE_MS = 7 * 86_400_000;

export type PassageResult = { status: "ok"; passage: D1Passage } | { status: "not_found" } | { status: "unavailable"; reason: "not_configured" | "error" };

export function bibleConfigured(): boolean {
  return Boolean(process.env.YOUVERSION_APP_KEY);
}

/** One call to YouVersion. Null when it couldn't be made (no key, network, timeout). */
async function yv(path: string): Promise<Response | null> {
  const key = process.env.YOUVERSION_APP_KEY;
  if (!key) return null;
  try {
    return await fetch(`${API}${path}`, { headers: { "X-YVP-App-Key": key, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (err) {
    console.error("⚠️ YouVersion request failed:", (err as Error).message);
    return null;
  }
}

/** The church's default Bible version (Admin → Destiny One → Settings). */
export async function defaultBibleId(): Promise<number> {
  const { data } = await createServiceClient().from("d1_settings").select("bible_id").eq("id", true).maybeSingle();
  const id = Number((data as { bible_id?: number } | null)?.bible_id);
  return Number.isInteger(id) && id > 0 ? id : 113;
}

interface Version {
  abbreviation: string;
  title: string;
  copyright: string | null;
}

/** A version's name, abbreviation and copyright line, cached for a week. */
async function getVersion(bibleId: number): Promise<Version | null> {
  const supabase = createServiceClient();
  const { data: cached } = await supabase.from("d1_bible_versions").select("abbreviation, title, copyright, fetched_at").eq("bible_id", bibleId).maybeSingle();
  if (cached && Date.now() - Date.parse(cached.fetched_at as string) < VERSION_CACHE_MS) return cached as Version;

  const res = await yv(`/bibles/${bibleId}`);
  if (!res?.ok) return (cached as Version | null) ?? null;
  const json = (await res.json().catch(() => null)) as { abbreviation?: string; localized_abbreviation?: string; title?: string; localized_title?: string; copyright?: string | null } | null;
  if (!json) return (cached as Version | null) ?? null;
  const version: Version = {
    abbreviation: json.localized_abbreviation || json.abbreviation || String(bibleId),
    title: json.localized_title || json.title || "Bible",
    copyright: json.copyright ?? null,
  };
  await supabase.from("d1_bible_versions").upsert({ bible_id: bibleId, ...version, fetched_at: new Date().toISOString() });
  return version;
}

function toPassage(bibleId: number, passageId: string, reference: string, content: string, version: Version | null): D1Passage {
  return {
    passageId,
    bibleId,
    reference: reference || passageLabel(passageId) || passageId,
    text: content.trim(),
    abbreviation: version?.abbreviation ?? null,
    versionTitle: version?.title ?? null,
    copyright: version?.copyright ?? null,
    webUrl: bibleWebUrl(bibleId, passageId, version?.abbreviation ?? ""),
  };
}

/** A passage's words, from our cache or YouVersion. */
export async function getPassage(passageId: string, bibleId?: number): Promise<PassageResult> {
  if (!isPassageId(passageId)) return { status: "not_found" };
  const id = bibleId ?? (await defaultBibleId());
  const supabase = createServiceClient();

  const { data: cached } = await supabase.from("d1_bible_passages").select("reference, content, fetched_at").eq("bible_id", id).eq("passage_id", passageId).maybeSingle();
  const fresh = cached && Date.now() - Date.parse(cached.fetched_at as string) < CACHE_MS;
  if (fresh) return { status: "ok", passage: toPassage(id, passageId, cached.reference as string, cached.content as string, await getVersion(id)) };

  if (!bibleConfigured()) return { status: "unavailable", reason: "not_configured" };
  const res = await yv(`/bibles/${id}/passages/${passageId}?format=text&include_headings=false&include_notes=false`);
  if (res?.status === 404) return { status: "not_found" };
  if (!res?.ok) {
    if (res) console.error(`⚠️ YouVersion passage ${passageId} returned ${res.status}`);
    return { status: "unavailable", reason: "error" };
  }
  const json = (await res.json().catch(() => null)) as { content?: string; reference?: string } | null;
  if (!json?.content) return { status: "not_found" };

  const now = new Date().toISOString();
  await supabase.from("d1_bible_passages").upsert({ bible_id: id, passage_id: passageId, reference: json.reference ?? "", content: json.content, fetched_at: now });
  // Words past the cache window go: the licence decides how long we may keep them.
  void supabase.from("d1_bible_passages").delete().lt("fetched_at", new Date(Date.now() - CACHE_MS).toISOString()).then(() => undefined);
  return { status: "ok", passage: toPassage(id, passageId, json.reference ?? "", json.content, await getVersion(id)) };
}

/** Today's date and day of the year, in UK time (the verse changes at midnight here). */
export function ukDay(now: Date = new Date()): { date: string; dayOfYear: number } {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [y, m, d] = date.split("-").map(Number);
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
  return { date, dayOfYear };
}

/** YouVersion's verse of the day (their pick: we can't choose it), in the church's version. One call a day for everyone. */
export async function verseOfTheDay(): Promise<{ date: string; result: PassageResult }> {
  const { date, dayOfYear } = ukDay();
  const supabase = createServiceClient();
  const { data: cached } = await supabase.from("d1_bible_votd").select("passage_id").eq("day", date).maybeSingle();
  let passageId = (cached?.passage_id as string | undefined) ?? null;

  if (!passageId) {
    if (!bibleConfigured()) return { date, result: { status: "unavailable", reason: "not_configured" } };
    const res = await yv(`/verse-of-the-days/${dayOfYear}`);
    if (!res?.ok) return { date, result: { status: "unavailable", reason: "error" } };
    const json = (await res.json().catch(() => null)) as { passage_id?: string; data?: { passage_id?: string } } | null;
    passageId = json?.passage_id ?? json?.data?.passage_id ?? null;
    if (!passageId || !isPassageId(passageId)) return { date, result: { status: "unavailable", reason: "error" } };
    await supabase.from("d1_bible_votd").upsert({ day: date, passage_id: passageId });
  }
  return { date, result: await getPassage(passageId) };
}

// ── Verse cards on messages ─────────────────────────────────────────────────

async function setVerseRef(messageId: number, groupId: string, verse: D1VerseRef | null): Promise<void> {
  const { error } = await createServiceClient()
    .from("d1_messages")
    .update({ verse_ref: verse ? sealBody(JSON.stringify({ passageId: verse.passageId, bibleId: verse.bibleId }), groupId) : null })
    .eq("id", messageId)
    .is("deleted_at", null);
  if (error) {
    console.error("⚠️ Destiny One verse card save failed:", error.message);
    return;
  }
  await broadcastToGroup(groupId, "verse_card", { id: messageId, groupId, verse });
}

/**
 * Finds the first reference in a message and gives it a verse card, the way link
 * previews work: called from `after()` once the message is saved, so sending never
 * waits for YouVersion. A reference YouVersion says doesn't exist ("John 3:99")
 * gets no card; one it couldn't check (down, or not set up yet) keeps its card,
 * which then says "Couldn't load this verse". `clearIfNone` (an edit) removes a
 * card the new text no longer has.
 */
export async function attachVerseCard(messageId: number, groupId: string, body: string | null, opts: { clearIfNone?: boolean } = {}): Promise<void> {
  try {
    const ref = findReference(body);
    if (!ref) {
      if (opts.clearIfNone) await setVerseRef(messageId, groupId, null);
      return;
    }
    const bibleId = await defaultBibleId();
    const checked = await getPassage(ref.passageId, bibleId);
    if (checked.status === "not_found") {
      if (opts.clearIfNone) await setVerseRef(messageId, groupId, null);
      return;
    }
    await setVerseRef(messageId, groupId, { passageId: ref.passageId, bibleId, label: ref.label });
  } catch (err) {
    console.error("⚠️ Destiny One verse card failed:", (err as Error).message);
  }
}

/** The sender takes the card off their message (as they would a link preview). */
export async function removeVerseCard(messageId: number, groupId: string): Promise<void> {
  await setVerseRef(messageId, groupId, null);
}
