import OpenAI from "openai";

// Shared OpenAI client factory. Returns null when no API key is configured so
// callers can degrade gracefully instead of throwing. Replaces the three
// duplicated `new OpenAI()` instantiations across the search/chat/page code.

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/** The model used across Smart Search. Bumped from gpt-4.1-nano to reduce hallucinations. */
export const SMART_SEARCH_MODEL = "gpt-4.1-mini";
