import "server-only";

import { SupabaseClient } from "@supabase/supabase-js";
import { mapRowToSermon, SermonRow } from "./db";
import { generateSermonSummary, formatSummaryBullets } from "./summary";
import { getSupabaseAdmin } from "./supabase";
import { Sermon } from "./types";
import { transcribeAudio } from "./whisper";

type ProcessStatus = "created" | "skipped";

export type SermonProcessResult = {
  transcriptStatus: ProcessStatus;
  summaryStatus: ProcessStatus;
  transcriptLength: number;
  summaryLength: number;
};

const cleanText = (value?: string | null) => (value ?? "").trim();

async function fetchSermon(
  client: SupabaseClient,
  sermonId: string,
): Promise<Sermon> {
  const { data, error } = await client
    .from("sermons")
    .select("*")
    .eq("id", sermonId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load sermon ${sermonId}: ${error.message}`);
  if (!data) throw new Error(`Sermon not found for id ${sermonId}`);

  return mapRowToSermon(data as SermonRow);
}

type SermonField = "transcript" | "summary";

async function persistField(
  client: SupabaseClient,
  sermonId: string,
  field: SermonField,
  value: string,
): Promise<string> {
  const payload: Record<string, unknown> = {
    [field]: value,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("sermons")
    .update(payload)
    .eq("id", sermonId)
    .select(field)
    .single();

  if (error) {
    throw new Error(`Failed to store ${field} for ${sermonId}: ${error.message}`);
  }

  const stored = cleanText((data as Record<string, unknown>)[field] as string | undefined);
  if (!stored) {
    throw new Error(
      `Verification failed: ${field} is empty after saving for ${sermonId}`,
    );
  }

  return stored;
}

async function verifyTranscript(
  client: SupabaseClient,
  sermonId: string,
): Promise<string> {
  const { data, error } = await client
    .from("sermons")
    .select("transcript")
    .eq("id", sermonId)
    .single();

  if (error) {
    throw new Error(`Failed to verify transcript for ${sermonId}: ${error.message}`);
  }

  const transcript = cleanText((data as { transcript?: string }).transcript);
  if (!transcript) {
    throw new Error(`Transcript verification failed for ${sermonId}`);
  }

  return transcript;
}

export async function processSermonAI(
  sermonId: string,
): Promise<SermonProcessResult> {
  const client = getSupabaseAdmin();
  const sermon = await fetchSermon(client, sermonId);

  const result: SermonProcessResult = {
    transcriptStatus: "skipped",
    summaryStatus: "skipped",
    transcriptLength: cleanText(sermon.transcript).length,
    summaryLength: cleanText(sermon.summary).length,
  };

  const audioUrl = cleanText(sermon.podcastAudioUrl);
  if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) {
    throw new Error("No valid podcast audio URL to transcribe for this sermon.");
  }

  let transcript = cleanText(sermon.transcript);
  if (transcript) {
    console.info(
      `[ai] Transcript already exists for ${sermonId}, skipping Whisper (${transcript.length.toLocaleString()} chars).`,
    );
  } else {
    try {
      const generated = cleanText(await transcribeAudio(audioUrl));
      if (!generated) {
        throw new Error("Whisper returned an empty transcript.");
      }

      await persistField(client, sermonId, "transcript", generated);
      transcript = await verifyTranscript(client, sermonId);
      console.info(
        `[ai] Transcript saved for ${sermonId} (${transcript.length.toLocaleString()} chars).`,
      );
      result.transcriptStatus = "created";
      result.transcriptLength = transcript.length;
    } catch (error) {
      console.error(`[ai] Transcription failed for ${sermonId}`, error);
      const message = error instanceof Error ? error.message : "Unknown transcription error";
      throw new Error(message);
    }
  }

  if (!transcript) {
    throw new Error("Transcript unavailable after transcription; aborting summary.");
  }

  let summary = cleanText(sermon.summary);
  if (summary) {
    console.info(
      `[ai] Summary already exists for ${sermonId}, skipping generation (${summary.length.toLocaleString()} chars).`,
    );
  } else {
    try {
      const bullets = await generateSermonSummary(transcript);
      const formatted = formatSummaryBullets(bullets);
      if (!formatted.trim()) {
        throw new Error("Summary generation returned empty content.");
      }

      summary = await persistField(client, sermonId, "summary", formatted.trim());
      console.info(
        `[ai] Summary saved for ${sermonId} (${summary.length.toLocaleString()} chars).`,
      );
      result.summaryStatus = "created";
      result.summaryLength = summary.length;
    } catch (error) {
      console.error(`[ai] Summarisation failed for ${sermonId}`, error);
      const message = error instanceof Error ? error.message : "Unknown summary error";
      throw new Error(message);
    }
  }

  result.transcriptLength = transcript.length;
  result.summaryLength = summary.length;

  return result;
}
