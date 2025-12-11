import "server-only";

import OpenAI from "openai";
import type { SummaryPoint, SummaryPointsPayload } from "./types";
import { getSupabaseAdmin } from "./supabase";

const SUMMARY_POINTS_MODEL = process.env.OPENAI_SUMMARY_MODEL || "gpt-4.1-mini";
const MAX_JSON_ATTEMPTS = 3;

type TranscriptSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
};

type ModelPoint = {
  title: string;
  description: string;
  segment_id: number;
};

type ModelResponse = {
  points: ModelPoint[];
};

const SYSTEM_PROMPT = `You receive a sermon transcript as an array of timed segments:
[{ id: number, start: number, end: number, text: string }, ...]
Your task is to create 3–6 structured sermon points.
For each point, return:
- title
- description (1–4 sentences)
- segment_id (the segment where the point begins)
Return ONLY JSON:
{
  "points": [
    { "title": "...", "description": "...", "segment_id": number }
  ]
}
Do not output anything except JSON.`;

function sanitizeSegments(input: unknown): TranscriptSegment[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((segment) => {
      const candidate = segment as Partial<TranscriptSegment>;
      const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
      const id = Number(candidate.id);
      const start = Number(candidate.start);
      const end = Number(candidate.end);

      if (!Number.isFinite(id) || !Number.isFinite(start) || !Number.isFinite(end)) {
        return null;
      }
      if (start < 0 || end < 0) return null;
      if (!text) return null;

      return { id, start, end, text };
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

function parseModelResponse(raw: string): ModelResponse | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.points)) {
      return null;
    }

    const points: ModelPoint[] = parsed.points
      .map((point: unknown) => {
        const candidate = point as Partial<ModelPoint>;
        const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
        const description =
          typeof candidate.description === "string" ? candidate.description.trim() : "";
        const segmentId = Number((candidate as { segment_id?: number }).segment_id);

        if (!title || !description || !Number.isFinite(segmentId)) return null;

        return { title, description, segment_id: segmentId };
      })
      .filter((point: ModelPoint | null): point is ModelPoint => Boolean(point));

    if (!points.length) return null;

    return { points };
  } catch {
    return null;
  }
}

function buildUserPrompt(title: string, segments: TranscriptSegment[]): string {
  const sermonTitle = title?.trim() || "Destiny Sermon";
  const segmentsJson = JSON.stringify(segments);

  return `Sermon title: ${sermonTitle}
Transcript segments:
${segmentsJson}
Return JSON only.`;
}

async function loadTranscriptSegments(sermonId: string) {
  const supabase = getSupabaseAdmin();

  const [{ data: transcriptRow, error: transcriptError }, { data: sermonRow, error: sermonError }] =
    await Promise.all([
      supabase
        .from("sermon_transcripts")
        .select("segments")
        .eq("sermon_id", sermonId)
        .maybeSingle(),
      supabase.from("sermons").select("title").eq("id", sermonId).maybeSingle(),
    ]);

  if (transcriptError) {
    throw new Error(
      `Failed to load transcript segments for ${sermonId}: ${transcriptError.message}`,
    );
  }

  if (sermonError) {
    throw new Error(`Failed to load sermon ${sermonId}: ${sermonError.message}`);
  }

  const rawSegments = transcriptRow?.segments;
  const segments = sanitizeSegments(rawSegments);
  if (!segments.length) {
    throw new Error(`No transcript segments found for sermon ${sermonId}`);
  }

  const sermonTitle =
    typeof sermonRow?.title === "string" && sermonRow.title.trim()
      ? sermonRow.title.trim()
      : "Destiny Sermon";

  return { segments, sermonTitle };
}

async function requestSummaryPoints(
  sermonTitle: string,
  segments: TranscriptSegment[],
): Promise<ModelResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const client = new OpenAI({ apiKey });
  const userPrompt = buildUserPrompt(sermonTitle, segments);
  let lastError = "Model did not return valid JSON";

  for (let attempt = 1; attempt <= MAX_JSON_ATTEMPTS; attempt += 1) {
    const completion = await client.chat.completions.create({
      model: SUMMARY_POINTS_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = parseModelResponse(content);
    if (parsed) return parsed;

    lastError = `Attempt ${attempt} returned invalid JSON`;
    console.warn(`[summary-points] ${lastError}`);
  }

  throw new Error(lastError);
}

function buildSummaryPayload(
  response: ModelResponse,
  segments: TranscriptSegment[],
): SummaryPointsPayload {
  const startLookup = new Map<number, number>();
  segments.forEach((segment) => {
    if (Number.isFinite(segment.id) && Number.isFinite(segment.start)) {
      startLookup.set(segment.id, segment.start);
    }
  });

  const points: SummaryPoint[] = response.points
    .map((point, index) => {
      const start = startLookup.get(point.segment_id) ?? 0;
      const startSeconds = Number.isFinite(start) && start >= 0 ? start : 0;
      const title = point.title.trim();
      const description = point.description.trim();

      if (!title || !description) return null;

      const orderIndex = index;
      const id = `p${index + 1}`;

      return {
        id,
        order_index: orderIndex,
        title,
        description,
        start_seconds: startSeconds,
      };
    })
    .filter((point): point is SummaryPoint => Boolean(point));

  if (!points.length) {
    throw new Error("No valid summary points produced from model response");
  }

  return { points };
}

async function persistSummaryPoints(sermonId: string, payload: SummaryPointsPayload) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sermons")
    .update({ summary_points: payload, updated_at: new Date().toISOString() })
    .eq("id", sermonId)
    .select("summary_points")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to save summary points for ${sermonId}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No sermon updated when saving summary points for ${sermonId}`);
  }

  const stored = data?.summary_points as SummaryPointsPayload | undefined;
  if (!stored || !Array.isArray(stored.points) || !stored.points.length) {
    throw new Error(`Verification failed saving summary points for ${sermonId}`);
  }
}

export async function generateSummaryPointsForSermon(
  sermonId: string,
): Promise<SummaryPointsPayload> {
  if (!sermonId) throw new Error("Missing sermon_id");

  console.info(`[summary-points] Starting pipeline for sermon ${sermonId}`);

  try {
    const { segments, sermonTitle } = await loadTranscriptSegments(sermonId);
    const modelResponse = await requestSummaryPoints(sermonTitle, segments);
    const payload = buildSummaryPayload(modelResponse, segments);

    await persistSummaryPoints(sermonId, payload);

    console.info(
      `[summary-points] Saved ${payload.points.length} points for sermon ${sermonId}`,
    );

    return payload;
  } catch (error) {
    console.error(
      `[summary-points] Failed to generate summary points for ${sermonId}`,
      error,
    );
    const message =
      error instanceof Error ? error.message : "Unknown error generating summary points";
    throw new Error(message);
  }
}
