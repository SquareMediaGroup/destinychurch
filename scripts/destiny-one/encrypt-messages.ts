// One-off: seal the Destiny One chat text written before encryption at rest.
//
// Run once, after migration 20261004_01 is applied and the API that seals new
// messages is deployed, and before 20261004_02 (which then refuses any
// plaintext). Safe to run again: anything already sealed is skipped.
//
//   npx tsx --env-file=.env.local scripts/destiny-one/encrypt-messages.ts --dry-run
//   npx tsx --env-file=.env.local scripts/destiny-one/encrypt-messages.ts
//
// Needs the same keys as the API (D1_MSG_KEYS, D1_MSG_KEY_CURRENT,
// D1_SEARCH_KEY): text sealed with any other key can never be read by the app.
// Also SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or
// SUPABASE_SERVICE_ROLE_KEY).
//
// For each message: the body and any poll wording are sealed, and the search
// terms are written for the body. For each report: the reason is sealed.

import { createClient } from "@supabase/supabase-js";
import type { D1MessageContent } from "../../packages/shared/src/destinyOne/types";
import { indexTerms, isSealed, parseKeyring, seal } from "../../lib/destinyOne/sealing";

const dryRun = process.argv.includes("--dry-run");
const PAGE = 500;

const ring = parseKeyring({
  keys: process.env.D1_MSG_KEYS,
  current: process.env.D1_MSG_KEY_CURRENT,
  search: process.env.D1_SEARCH_KEY,
});
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY.");
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function sealPoll(content: D1MessageContent | null, groupId: string): D1MessageContent | null {
  if (content?.kind !== "poll") return content;
  const s = (text: string) => (isSealed(text) ? text : seal(ring, text, "msg", groupId));
  return {
    ...content,
    poll: { ...content.poll, question: s(content.poll.question), options: content.poll.options.map((o) => ({ ...o, label: s(o.label) })) },
  };
}

async function sealMessages(): Promise<void> {
  let sealed = 0;
  let after = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("d1_messages")
      .select("id, group_id, body, content")
      .gt("id", after)
      .order("id")
      .limit(PAGE);
    if (error) throw error;
    if (!data?.length) break;

    for (const m of data as { id: number; group_id: string; body: string | null; content: D1MessageContent | null }[]) {
      after = m.id;
      const bodyNeeds = Boolean(m.body) && !isSealed(m.body);
      const content = sealPoll(m.content, m.group_id);
      const contentNeeds = JSON.stringify(content) !== JSON.stringify(m.content);
      if (!bodyNeeds && !contentNeeds) continue;
      sealed++;
      if (dryRun) continue;

      // Terms first: if the update below fails the row is still plaintext and
      // a re-run picks it up; the terms insert ignores duplicates.
      if (bodyNeeds) {
        const terms = indexTerms(ring, m.body!, m.group_id).map((term) => ({ group_id: m.group_id, term, message_id: m.id }));
        const { error: termsError } = await supabase.from("d1_message_terms").upsert(terms, { ignoreDuplicates: true });
        if (termsError) throw termsError;
      }
      const { error: updateError } = await supabase
        .from("d1_messages")
        .update({ ...(bodyNeeds ? { body: seal(ring, m.body!, "msg", m.group_id) } : {}), ...(contentNeeds ? { content } : {}) })
        .eq("id", m.id);
      if (updateError) throw updateError;
    }
  }
  console.log(`🔐 messages ${dryRun ? "to seal" : "sealed"}: ${sealed}`);
}

async function sealReports(): Promise<void> {
  const { data, error } = await supabase.from("d1_reports").select("id, group_id, reason").not("reason", "like", "d1e:%");
  if (error) throw error;
  for (const r of data ?? []) {
    if (dryRun) continue;
    const { error: updateError } = await supabase
      .from("d1_reports")
      .update({ reason: seal(ring, r.reason as string, "report", r.group_id as string) })
      .eq("id", r.id);
    if (updateError) throw updateError;
  }
  console.log(`🔐 report reasons ${dryRun ? "to seal" : "sealed"}: ${(data ?? []).length}`);
}

await sealMessages();
await sealReports();
console.log(dryRun ? "📝 Dry run: nothing written." : "✅ Done. Now apply 20261004_02_destiny_one_message_encryption_required.sql.");
