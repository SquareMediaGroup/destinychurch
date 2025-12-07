export async function generateSermonSummary(
  transcript: string,
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  // TODO: Call OpenAI GPT with the pastoral prompt to create summary bullets
  void transcript;
  return [];
}
