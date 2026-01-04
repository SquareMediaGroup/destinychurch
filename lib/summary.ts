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
Summarise the sermon into a minimum of 4 clear, core points (4–6 total).
Format the output as a numbered Markdown list only (1., 2., 3., ...). No sub-points.
Each numbered point must be on a single line.
Each point must include:
- A bolded title at the start (e.g., "**Jesus Sends Us:** ...").
- A well-expanded description of 2–3 sentences that feels sermon-level and pastoral.
- Clear spiritual application without over-fragmenting the message.
Keep the flow true to the sermon’s main message and avoid over-summarising.

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
    .map((line: string) =>
      line
        .replace(/^\s*\d+\.\s+/, "")
        .replace(/^[*\-•\s]+/, "")
        .trim(),
    )
    .filter(Boolean);
}

export function formatSummaryNumbered(lines: string[]): string {
  return lines
    .map((line) =>
      line
        .replace(/^\s*\d+\.\s+/, "")
        .replace(/^[*\-•\s]+/, "")
        .trim(),
    )
    .filter(Boolean)
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");
}
