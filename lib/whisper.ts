import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import OpenAI from "openai";

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

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
      response_format: "text",
      language: "en",
    });
    return transcription as string;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Whisper error";
    throw new Error(message);
  } finally {
    // Clean up temp file.
    fs.unlink(tmpFile).catch(() => {});
  }
}
