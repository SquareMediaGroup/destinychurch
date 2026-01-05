import "server-only";

import fs from "fs/promises";
import { createReadStream } from "fs";
import { spawn } from "child_process";
import path from "path";
import OpenAI from "openai";
import ffmpegPath from "ffmpeg-static";
import ffmpegPackage from "ffmpeg-static/package.json";
import { gunzip } from "zlib";
import { promisify } from "util";
import type { TranscriptSegment } from "./types";
import { sanitizeSegments } from "./transcriptSegments";

const OPENAI_AUDIO_LIMIT_BYTES = 25 * 1024 * 1024; // 25MB documented limit
const CHUNK_SECONDS = 600;

const resolvedFfmpegPath = process.env.FFMPEG_PATH || ffmpegPath || null;
const gunzipAsync = promisify(gunzip);
const ffmpegConfig =
  (ffmpegPackage as { ["ffmpeg-static"]?: Record<string, string> })[
    "ffmpeg-static"
  ] || {};
const FFMPEG_RELEASE =
  process.env.FFMPEG_BINARY_RELEASE || ffmpegConfig["binary-release-tag"];
const FFMPEG_BINARIES_URL =
  process.env.FFMPEG_BINARIES_URL ||
  ffmpegConfig["binaries-url"] ||
  "https://github.com/eugeneware/ffmpeg-static/releases/download";
const FFMPEG_CACHE_DIR = "ffmpeg-static";
const FFMPEG_CACHE_NAME = "ffmpeg";

const fileExists = async (filePath: string | null | undefined) => {
  if (!filePath) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

let ffmpegBinaryPromise: Promise<string> | null = null;

const getFfmpegDownloadUrl = () => {
  if (!FFMPEG_RELEASE) {
    throw new Error("FFmpeg release tag is missing.");
  }
  const platform = process.env.npm_config_platform || process.platform;
  const arch = process.env.npm_config_arch || process.arch;
  return `${FFMPEG_BINARIES_URL}/${FFMPEG_RELEASE}/ffmpeg-${platform}-${arch}.gz`;
};

const ensureFfmpegBinary = async () => {
  if (await fileExists(resolvedFfmpegPath)) {
    return resolvedFfmpegPath as string;
  }

  const tmpDir = process.env.TMPDIR || "/tmp";
  const cachedPath = path.join(tmpDir, FFMPEG_CACHE_DIR, FFMPEG_CACHE_NAME);

  if (await fileExists(cachedPath)) {
    return cachedPath;
  }

  const downloadUrl = getFfmpegDownloadUrl();
  console.info(`[ai] Downloading ffmpeg binary from ${downloadUrl}`);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download ffmpeg (${response.status} ${response.statusText}).`,
    );
  }

  const gzBuffer = Buffer.from(await response.arrayBuffer());
  const binaryBuffer = await gunzipAsync(gzBuffer);

  await fs.mkdir(path.dirname(cachedPath), { recursive: true });
  await fs.writeFile(cachedPath, binaryBuffer, { mode: 0o755 });

  return cachedPath;
};

const resolveFfmpegBinary = () => {
  if (!ffmpegBinaryPromise) {
    ffmpegBinaryPromise = ensureFfmpegBinary();
  }
  return ffmpegBinaryPromise;
};

const runFfmpeg = async (args: string[], label: string) => {
  const binaryPath = await resolveFfmpegBinary();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(binaryPath, args, {
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
