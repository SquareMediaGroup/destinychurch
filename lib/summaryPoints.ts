import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import type { SummaryPoint, SummaryPointsPayload, TranscriptSegment } from "./types";
import { getSupabaseAdmin } from "./supabase";
import {
  getTranscriptSegments,
  sanitizeSegments,
  upsertTranscriptSegments,
} from "./transcriptSegments";
import { transcribeAudio } from "./whisper";

const SUMMARY_POINTS_MODEL = process.env.OPENAI_SUMMARY_MODEL || "gpt-4.1-mini";
const MAX_JSON_ATTEMPTS = 3;
const OPENAI_AUDIO_LIMIT_BYTES = 25 * 1024 * 1024; // 25MB documented limit

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
Your task is to create 4–6 structured sermon points.
Each point must have:
- title (short, clear, not Markdown)
- description (2–3 sentences, reflective and pastoral, with clear spiritual application)
- segment_id (the segment where the point begins)
Keep the points balanced with depth; avoid over-fragmenting or over-summarising.
Return ONLY JSON:
{
  "points": [
    { "title": "...", "description": "...", "segment_id": number }
  ]
}
Do not output anything except JSON.`;

type SermonContext = {
  sermonTitle: string;
  audioUrl: string;
  transcriptText: string;
  segments: TranscriptSegment[];
};

const countSentences = (value: string) =>
  value
    .split(/[.!?](?:\s|$)/)
    .map((segment) => segment.trim())
    .filter(Boolean).length;

function buildSegmentsFromTranscript(transcript: string): TranscriptSegment[] {
  const words = transcript
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  if (!words.length) return [];

  const chunkSize = 80; // ~30 seconds at ~160 wpm
  const segments: TranscriptSegment[] = [];
  let startSeconds = 0;
  let id = 1;

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    const text = chunk.join(" ");
    const durationSeconds = Math.max(10, Math.round(chunk.length / 2.6)); // ~2.6 words/sec
    const endSeconds = startSeconds + durationSeconds;

    segments.push({
      id,
      start: startSeconds,
      end: endSeconds,
      text,
    });

    startSeconds = endSeconds;
    id += 1;
  }

  return segments;
}

async function loadSermonContext(
  supabase: SupabaseClient,
  sermonId: string,
): Promise<SermonContext> {
  const { data: sermonRow, error: sermonError } = await supabase
    .from("sermons")
    .select("title, podcast_audio_url, transcript")
    .eq("id", sermonId)
    .maybeSingle();

  if (sermonError) {
    throw new Error(`Failed to load sermon ${sermonId}: ${sermonError.message}`);
  }

  if (!sermonRow) {
    throw new Error(`Sermon not found for id ${sermonId}`);
  }

  let segments: TranscriptSegment[] = [];
  try {
    segments = await getTranscriptSegments(supabase, sermonId);
  } catch (error) {
    console.warn(`[summary-points] Unable to load transcript segments for ${sermonId}`, error);
  }

  const sermonTitle =
    typeof sermonRow.title === "string" && sermonRow.title.trim()
      ? sermonRow.title.trim()
      : "Destiny Sermon";

  const audioUrl =
    typeof sermonRow.podcast_audio_url === "string" ? sermonRow.podcast_audio_url.trim() : "";

  const transcriptText =
    typeof sermonRow.transcript === "string" ? sermonRow.transcript.trim() : "";

  return { sermonTitle, audioUrl, transcriptText, segments };
}

async function ensureTranscriptSegments(
  supabase: SupabaseClient,
  sermonId: string,
  context: SermonContext,
): Promise<TranscriptSegment[]> {
  const existing = sanitizeSegments(context.segments);
  if (existing.length) return existing;

  const transcriptSegments = buildSegmentsFromTranscript(context.transcriptText);
  if (transcriptSegments.length) {
    console.warn(
      `[summary-points] Using transcript-derived segments for ${sermonId} (no timings available).`,
    );
    return transcriptSegments;
  }

  const audioUrl = context.audioUrl?.trim();
  if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) {
    throw new Error(
      "Transcript segments missing and no valid audio URL available. Upload an SRT/VTT transcript for this sermon first.",
    );
  }

  // Preflight size to inform chunking when audio files exceed 25MB.
  try {
    const head = await fetch(audioUrl, { method: "HEAD" });
    const contentLength = Number(head.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > OPENAI_AUDIO_LIMIT_BYTES) {
      const mb = (contentLength / (1024 * 1024)).toFixed(1);
      console.info(
        `[summary-points] Audio file is ${mb}MB; chunked transcription will be used.`,
      );
    }
  } catch (sizeError) {
    // If HEAD fails we still attempt.
  }

  try {
    const { text, segments } = await transcribeAudio(audioUrl);
    const sanitized = sanitizeSegments(segments);
    if (!sanitized.length) {
      throw new Error(`No transcript segments could be generated for sermon ${sermonId}`);
    }

    try {
      await upsertTranscriptSegments(supabase, sermonId, sanitized, "ready");
    } catch (error) {
      console.error(
        `[summary-points] Failed to persist transcript segments for ${sermonId}`,
        error,
      );
    }

    if (!context.transcriptText && text.trim()) {
      try {
        await supabase
          .from("sermons")
          .update({ transcript: text.trim(), updated_at: new Date().toISOString() })
          .eq("id", sermonId);
      } catch (error) {
        console.warn(
          `[summary-points] Transcript text was generated but not saved for ${sermonId}`,
          error,
        );
      }
    }

    return sanitized;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate transcript segments";
    throw new Error(message);
  }
}

function parseModelResponse(raw: string): ModelResponse | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.points)) {
      return null;
    }

    const points = parsed.points.map((point: unknown) => {
      const candidate = point as Partial<ModelPoint>;
      const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
      const description =
        typeof candidate.description === "string" ? candidate.description.trim() : "";
      const segmentId = Number((candidate as { segment_id?: number }).segment_id);
      const sentenceCount = description ? countSentences(description) : 0;

      if (!title || !description || !Number.isFinite(segmentId)) return null;
      if (sentenceCount < 2 || sentenceCount > 3) return null;

      return { title, description, segment_id: segmentId };
    });

    if (points.some((point: ModelPoint | null) => !point)) return null;

    const resolvedPoints = points as ModelPoint[];

    if (resolvedPoints.length < 4 || resolvedPoints.length > 6) return null;

    return { points: resolvedPoints };
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
    const supabase = getSupabaseAdmin();
    const context = await loadSermonContext(supabase, sermonId);
    const segments = await ensureTranscriptSegments(supabase, sermonId, context);
    const modelResponse = await requestSummaryPoints(context.sermonTitle, segments);
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
