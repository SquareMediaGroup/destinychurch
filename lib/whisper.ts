import "server-only";

import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import OpenAI from "openai";
import type { TranscriptSegment } from "./types";
import { sanitizeSegments } from "./transcriptSegments";

export async function transcribeAudio(
  audioUrl: string,
): Promise<{ text: string; segments: TranscriptSegment[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  console.info(`[ai] Downloading audio for transcription from ${audioUrl}`);

  // Download the audio to a temp file to avoid FormData/File quirks on Node.
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    throw new Error(`Failed to fetch audio: ${audioRes.status} ${audioRes.statusText}`);
  }
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  const tmpDir = process.env.TMPDIR || "/tmp";
  const tmpFile = path.join(tmpDir, `sermon-${Date.now()}.mp3`);
  await fs.writeFile(tmpFile, buffer);

  const client = new OpenAI({ apiKey });
  try {
    const transcription = await client.audio.transcriptions.create({
      file: createReadStream(tmpFile),
      model: "whisper-1",
      response_format: "verbose_json",
      language: "en",
    });

    const text = typeof transcription.text === "string" ? transcription.text.trim() : "";
    const segments = sanitizeSegments((transcription as { segments?: unknown }).segments);

    console.info(
      `[ai] Whisper transcription complete (${text.length.toLocaleString()} chars, ${segments.length} segments)`,
    );

    return { text, segments };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Whisper error";
    throw new Error(message);
  } finally {
    // Clean up temp file.
    fs.unlink(tmpFile).catch(() => {});
  }
}
