import OpenAI from "openai";

export async function generateSermonSummary(transcript: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const prompt = `You are writing a warm, Christ-centred summary for a Destiny Church sermon.
Generate 3-6 concise bullet points with key scripture references and the pastoral voice of Destiny Church.

Transcript:
${transcript}`;

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 300,
  });

  const content: string = completion.choices?.[0]?.message?.content ?? "";
  return content
    .split("\n")
    .map((line: string) => line.replace(/^[*-]\s*/, "").trim())
    .filter(Boolean);
}
