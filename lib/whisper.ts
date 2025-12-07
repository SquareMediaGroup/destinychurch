export async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  // TODO: Call OpenAI Whisper with the podcast audio to produce a transcript
  void audioUrl;
  return "";
}
