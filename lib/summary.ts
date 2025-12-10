import "server-only";

import OpenAI from "openai";

const SUMMARY_MODEL = process.env.OPENAI_SUMMARY_MODEL || "gpt-4.1-mini";

export async function generateSermonSummary(transcript: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const cleanedTranscript = transcript.trim();
  if (!cleanedTranscript) {
    throw new Error("Cannot summarise an empty transcript.");
  }

  const prompt = `You are writing a warm, Christ-centred summary for a Destiny Church sermon.
Generate 3-6 concise bullet points with key scripture references and the pastoral voice of Destiny Church.

Transcript:
${cleanedTranscript}`;

  const client = new OpenAI({ apiKey });

  console.info(
    `[ai] Summarising transcript (${cleanedTranscript.length.toLocaleString()} chars) with ${SUMMARY_MODEL}`,
  );

  const completion = await client.chat.completions.create({
    model: SUMMARY_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 300,
  });

  const content: string = completion.choices?.[0]?.message?.content ?? "";
  return content
    .split("\n")
    .map((line: string) => line.replace(/^[*\-•\s]+/, "").trim())
    .filter(Boolean);
}

export function formatSummaryBullets(lines: string[]): string {
  return lines
    .map((line) => line.replace(/^[*\-•\s]+/, "").trim())
    .filter(Boolean)
    .map((line) => `• ${line}`)
    .join("\n");
}
