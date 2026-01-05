import "server-only";

import fs from "fs/promises";
import { createReadStream } from "fs";
import { spawn } from "child_process";
import path from "path";
import OpenAI from "openai";
import ffmpegPath from "ffmpeg-static";
import type { TranscriptSegment } from "./types";
import { sanitizeSegments } from "./transcriptSegments";

const OPENAI_AUDIO_LIMIT_BYTES = 25 * 1024 * 1024; // 25MB documented limit
const CHUNK_SECONDS = 600;

const resolvedFfmpegPath = process.env.FFMPEG_PATH || ffmpegPath;

const runFfmpeg = async (args: string[], label: string) => {
  if (!resolvedFfmpegPath) {
    throw new Error("FFmpeg is required to split large audio files.");
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(resolvedFfmpegPath as string, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} failed with code ${code}: ${stderr}`));
      }
    });
  });
};

const downloadAudioToFile = async (audioUrl: string) => {
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    throw new Error(`Failed to fetch audio: ${audioRes.status} ${audioRes.statusText}`);
  }

  const tmpDir = process.env.TMPDIR || "/tmp";
  const tmpFile = path.join(tmpDir, `sermon-${Date.now()}.mp3`);
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  await fs.writeFile(tmpFile, buffer);

  const stats = await fs.stat(tmpFile);
  return { tmpFile, size: stats.size };
};

const transcribeFile = async (client: OpenAI, filePath: string) => {
  const transcription = await client.audio.transcriptions.create({
    file: createReadStream(filePath),
    model: "whisper-1",
    response_format: "verbose_json",
    language: "en",
  });

  const text = typeof transcription.text === "string" ? transcription.text.trim() : "";
  const segments = sanitizeSegments((transcription as { segments?: unknown }).segments);
  return { text, segments };
};

const splitAudioIntoChunks = async (inputFile: string, chunkDir: string) => {
  const outputPattern = path.join(chunkDir, "chunk-%03d.mp3");

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputFile,
    "-f",
    "segment",
    "-segment_time",
    String(CHUNK_SECONDS),
    "-reset_timestamps",
    "1",
    "-ac",
    "1",
    "-ar",
    "44100",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    outputPattern,
  ];

  await runFfmpeg(args, "Audio chunking");

  const files = (await fs.readdir(chunkDir))
    .filter((file) => file.startsWith("chunk-") && file.endsWith(".mp3"))
    .sort();

  if (!files.length) {
    throw new Error("FFmpeg did not create any audio chunks.");
  }

  return files.map((file) => path.join(chunkDir, file));
};

export async function transcribeAudio(
  audioUrl: string,
): Promise<{ text: string; segments: TranscriptSegment[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  console.info(`[ai] Downloading audio for transcription from ${audioUrl}`);

  const client = new OpenAI({ apiKey });
  const { tmpFile, size } = await downloadAudioToFile(audioUrl);
  const tmpDir = process.env.TMPDIR || "/tmp";
  let chunkDir: string | null = null;

  try {
    if (size <= OPENAI_AUDIO_LIMIT_BYTES) {
      const { text, segments } = await transcribeFile(client, tmpFile);

      console.info(
        `[ai] Whisper transcription complete (${text.length.toLocaleString()} chars, ${segments.length} segments)`,
      );

      return { text, segments };
    }

    console.info(
      `[ai] Audio is ${(size / (1024 * 1024)).toFixed(1)}MB; chunking into ${CHUNK_SECONDS / 60} minute segments.`,
    );

    chunkDir = await fs.mkdtemp(path.join(tmpDir, "sermon-chunks-"));
    const chunkFiles = await splitAudioIntoChunks(tmpFile, chunkDir);

    let combinedText: string[] = [];
    let combinedSegments: TranscriptSegment[] = [];
    let nextId = 1;

    for (let index = 0; index < chunkFiles.length; index += 1) {
      const chunkPath = chunkFiles[index];
      const { text, segments } = await transcribeFile(client, chunkPath);
      const offset = index * CHUNK_SECONDS;
      const adjusted = segments.map((segment) => ({
        ...segment,
        id: nextId++,
        start: segment.start + offset,
        end: segment.end + offset,
      }));

      if (text) combinedText.push(text.trim());
      combinedSegments.push(...adjusted);
    }

    const text = combinedText.join("\n").trim();
    const segments = sanitizeSegments(combinedSegments);

    console.info(
      `[ai] Whisper chunked transcription complete (${text.length.toLocaleString()} chars, ${segments.length} segments)`,
    );

    return { text, segments };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Whisper error";
    throw new Error(message);
  } finally {
    fs.unlink(tmpFile).catch(() => {});
    if (chunkDir) {
      fs.rm(chunkDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
