import "server-only";

import type { TranscriptSegment } from "./types";

const timeToSeconds = (value: string): number | null => {
  const trimmed = value.trim();
  const match = trimmed.match(
    /(?<h>\d{1,2}):(?<m>\d{1,2}):(?<s>\d{1,2})([,.](?<ms>\d{1,3}))?/,
  );
  if (!match || !match.groups) return null;

  const hours = Number(match.groups.h);
  const minutes = Number(match.groups.m);
  const seconds = Number(match.groups.s);
  const millis = Number(match.groups.ms ?? 0);

  if ([hours, minutes, seconds, millis].some((n) => Number.isNaN(n))) return null;

  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
};

const cleanText = (text: string) =>
  text
    .replace(/<[^>]+>/g, " ") // drop tags
    .replace(/\s+/g, " ")
    .trim();

export function parseSrt(input: string): TranscriptSegment[] {
  if (!input) return [];

  const content = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const blocks = content
    .replace(/^WEBVTT.*\n+/i, "") // strip VTT header if present
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const segments: TranscriptSegment[] = [];
  let id = 1;

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let timeLine = lines[0];
    let textLines = lines.slice(1);

    if (/^\d+$/.test(timeLine) && lines[1]?.includes("-->")) {
      timeLine = lines[1];
      textLines = lines.slice(2);
    }

    if (!timeLine.includes("-->")) continue;

    const [startRaw, endRaw] = timeLine.split("-->").map((part) => part.trim());
    const start = timeToSeconds(startRaw);
    const end = timeToSeconds(endRaw);

    if (start === null || end === null || end <= start) continue;

    const text = cleanText(textLines.join(" "));
    if (!text) continue;

    segments.push({
      id,
      start,
      end,
      text,
    });

    id += 1;
  }

  return segments;
}
