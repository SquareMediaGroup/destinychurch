import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TranscriptSegment } from "./types";

export function sanitizeSegments(input: unknown): TranscriptSegment[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((segment) => {
      const candidate = segment as Partial<TranscriptSegment>;
      const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
      const id = Number(candidate.id);
      const start = Number(candidate.start);
      const end = Number(candidate.end);

      if (!text) return null;
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
      if (start < 0 || end < 0) return null;

      return {
        id: Number.isFinite(id) ? id : 0,
        start,
        end,
        text,
      };
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

export async function getTranscriptSegments(
  supabase: SupabaseClient,
  sermonId: string,
): Promise<TranscriptSegment[]> {
  const { data, error } = await supabase
    .from("sermon_transcripts")
    .select("segments")
    .eq("sermon_id", sermonId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load transcript segments for ${sermonId}: ${error.message}`);
  }

  return sanitizeSegments(data?.segments);
}

export async function upsertTranscriptSegments(
  supabase: SupabaseClient,
  sermonId: string,
  segments: TranscriptSegment[],
  status: string = "ready",
): Promise<void> {
  if (!segments.length) return;

  const { error } = await supabase
    .from("sermon_transcripts")
    .upsert(
      {
        sermon_id: sermonId,
        segments,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "sermon_id" },
    );

  if (error) {
    throw new Error(`Failed to save transcript segments for ${sermonId}: ${error.message}`);
  }
}
