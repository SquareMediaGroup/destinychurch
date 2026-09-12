import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { getFullSermonArchive } from "@/lib/youtube";
import { normalizeSpeakerName } from "@/lib/sermonTitle";

// AI review of the sermons archive's speaker attribution, triggered from
// /admin/sermons. lib/sermonTitle.ts's regex parse is right for current,
// well-formatted titles but produces noise on years of inconsistent older
// ones ("22.03.20", "FULL SERVICE", "DESTINY CHURCH LIVE!") — this reads each
// video's title + description with an LLM and stores a correction in
// speaker_overrides when it disagrees. Read via lib/speakerOverrides.server.ts.

const BATCH_SIZE = 20;
/** How many batches run concurrently — keeps a full-archive review to a few
 *  requests wide rather than one huge sequential queue or an OpenAI-rate-limit trip. */
const CONCURRENCY = 3;
const DESCRIPTION_CHARS = 300;

export interface SpeakerReviewChange {
  videoId: string;
  title: string;
  before: string | null;
  after: string | null;
}

export interface SpeakerReviewResult {
  reviewed: number;
  changed: SpeakerReviewChange[];
  skipped: number;
  errors: number;
}

interface ReviewItem {
  id: string;
  title: string;
  parsedSpeaker: string | null;
  description: string;
}

const SYSTEM_PROMPT = `You review YouTube sermon metadata for a church website to identify who preached each message.

For each video you're given its title, a regex-parsed guess at the speaker (may be wrong, noise, or missing), and a description excerpt. Decide the correct speaker:
- If the parsed guess is a real person's name (or multiple names joined by "&"/","), and it matches the title/description, keep it as-is.
- If the parsed guess is clearly not a person (a date, "FULL SERVICE", "DESTINY CHURCH LIVE!", empty, or otherwise garbage), or the description names a different/additional speaker, correct it.
- If the video genuinely has no individual speaker (e.g. a dedication service, worship-only clip, a trailer), return null.
- Preserve titles/honorifics as they naturally appear (e.g. "Ps John Smith"), don't invent one.
- When unsure, prefer the parsed guess over inventing a name.

Respond with strict JSON only: {"results": [{"id": "<video id>", "speaker": "<name or null>"}, ...]} — one entry per video given, same ids, no extra commentary.`;

function buildUserPrompt(items: ReviewItem[]): string {
  return JSON.stringify(
    items.map((i) => ({
      id: i.id,
      title: i.title,
      parsedSpeaker: i.parsedSpeaker,
      description: i.description,
    }))
  );
}

async function reviewBatch(
  items: ReviewItem[]
): Promise<Map<string, string | null>> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OPENAI_API_KEY is not configured");

  const res = await openai.chat.completions.create({
    model: SMART_SEARCH_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(items) },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { results?: { id?: string; speaker?: string | null }[] };
  const out = new Map<string, string | null>();
  for (const r of parsed.results ?? []) {
    if (typeof r.id === "string") out.set(r.id, typeof r.speaker === "string" ? r.speaker : null);
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Reviews the sermon archive's speaker attribution with AI, persisting
 * corrections to speaker_overrides. By default skips videos already reviewed
 * (an override row exists) so a re-run only costs new sermons; `force` reviews
 * everything again.
 */
export async function reviewSermonSpeakers(opts?: { force?: boolean }): Promise<SpeakerReviewResult> {
  const archive = await getFullSermonArchive();
  const supabase = createServiceClient();

  let alreadyReviewed = new Set<string>();
  if (!opts?.force) {
    const { data } = await supabase.from("speaker_overrides").select("video_id");
    alreadyReviewed = new Set((data ?? []).map((r) => r.video_id as string));
  }

  const toReview = archive.filter((v) => !alreadyReviewed.has(v.id));
  const skipped = archive.length - toReview.length;

  const items: ReviewItem[] = toReview.map((v) => ({
    id: v.id,
    title: v.title,
    parsedSpeaker: v.speaker,
    description: v.description.slice(0, DESCRIPTION_CHARS),
  }));

  const batches = chunk(items, BATCH_SIZE);
  const changed: SpeakerReviewChange[] = [];
  let reviewed = 0;
  let errors = 0;

  for (const group of chunk(batches, CONCURRENCY)) {
    const results = await Promise.allSettled(group.map(reviewBatch));

    const rowsToUpsert: { video_id: string; speaker: string | null; reviewed_by: string }[] = [];

    results.forEach((result, i) => {
      const batchItems = group[i];
      if (result.status === "rejected") {
        errors += batchItems.length;
        return;
      }
      for (const item of batchItems) {
        const decided = result.value.has(item.id) ? result.value.get(item.id)! : item.parsedSpeaker;
        reviewed += 1;
        rowsToUpsert.push({ video_id: item.id, speaker: decided, reviewed_by: "ai" });

        if (normalizeSpeakerName(decided) !== normalizeSpeakerName(item.parsedSpeaker)) {
          changed.push({
            videoId: item.id,
            title: item.title,
            before: item.parsedSpeaker,
            after: decided,
          });
        }
      }
    });

    if (rowsToUpsert.length > 0) {
      await supabase.from("speaker_overrides").upsert(rowsToUpsert, { onConflict: "video_id" });
    }
  }

  return { reviewed, changed, skipped, errors };
}
