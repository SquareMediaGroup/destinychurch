import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { SITE_KNOWLEDGE, ALLOWED_PAGES, PAGE_INTENTS } from "@/lib/siteKnowledge";

export interface SmartSearchResult {
  answer: string;
  page: string | null;
  ctaLabel: string | null;
  /** When present, `answer` is a clarifying question and these are tappable options. */
  options?: string[];
}

// Canned, friendly responses. Smart Search must ALWAYS return a usable answer —
// it must never surface "no results found" or an empty/error state.
export const FALLBACK_ANSWERS = {
  tooShort:
    "Ask me anything about Destiny — like service times, how to give, or kids' church.",
  unavailable:
    "I can't reach the assistant right now — please try again in a moment, or get in touch and we'll be glad to help.",
  empty:
    "I'm not totally sure on that one — the best thing is to get in touch and our team will be glad to help.",
} as const;

/** Friendly cooldown message shown when a visitor has searched too many times. */
export function cooldownAnswer(): SmartSearchResult {
  return {
    answer:
      "You've made a lot of searches in a short time — give it a minute and try again. In the meantime you can reach us directly and we'll be glad to help.",
    page: "/contact",
    ctaLabel: "Contact Us",
  };
}

const CTA_BY_PAGE = new Map(PAGE_INTENTS.map((p) => [p.href, p.cta]));

/**
 * Parse the model's free-text reply into prose + validated navigation.
 * The model is asked to append `PAGE:`/`CTA:` lines; we extract and allowlist
 * them, then strip them (and any stray separators) from the displayed answer.
 * Anything not in ALLOWED_PAGES is discarded so links can't be hallucinated.
 */
export function parseAnswer(raw: string): SmartSearchResult {
  // Clarifying-question options take priority: if the model offered options, it
  // is asking rather than answering, so PAGE/CTA are ignored.
  // Tolerate a leading bullet/number the model may prepend (e.g. "- OPTION:").
  const options = Array.from(raw.matchAll(/^\s*(?:[-*•]\s*|\d+[.)]\s*)?OPTION:\s*(.+?)\s*$/gim))
    .map((m) => m[1].replace(/^["']|["']$/g, "").trim())
    .filter(Boolean)
    .slice(0, 4);

  // Strip the OPTION/PAGE/CTA lines and any stray separator from the prose.
  const prose = raw
    .replace(/^\s*(?:[-*•]\s*|\d+[.)]\s*)?OPTION:\s*.+$/gim, "")
    .replace(/^\s*PAGE:\s*\S+\s*$/gim, "")
    .replace(/^\s*CTA:\s*.+$/gim, "")
    .replace(/^\s*[-=]{3,}\s*$/gm, "")
    .trim();

  if (options.length >= 2) {
    return { answer: prose || FALLBACK_ANSWERS.empty, page: null, ctaLabel: null, options };
  }

  const pageMatch = raw.match(/^\s*PAGE:\s*(\S+)\s*$/im);
  const ctaMatch = raw.match(/^\s*CTA:\s*(.+?)\s*$/im);

  let page: string | null = null;
  if (pageMatch) {
    const candidate = pageMatch[1].replace(/[.,)"']+$/, "").trim();
    if (ALLOWED_PAGES.has(candidate)) page = candidate;
  }

  let ctaLabel: string | null = null;
  if (page) {
    const raw1 = ctaMatch?.[1]?.replace(/^["']|["']$/g, "").trim() ?? "";
    // Keep only short, sensible labels; otherwise fall back to the page's default.
    if (raw1 && raw1.split(/\s+/).length <= 6) ctaLabel = raw1;
    else ctaLabel = CTA_BY_PAGE.get(page) ?? null;
  }

  return {
    answer: prose || FALLBACK_ANSWERS.empty,
    page,
    ctaLabel,
  };
}

/**
 * The core Smart Search engine. Grounds a single grounded, free-text answer in
 * SITE_KNOWLEDGE and returns prose + validated page/CTA. Always resolves to a
 * non-empty answer (canned fallback on missing key or error).
 */
export async function runSmartSearch(query: string, choice?: string): Promise<SmartSearchResult> {
  const openai = getOpenAI();
  if (!openai) {
    return { answer: FALLBACK_ANSWERS.unavailable, page: "/contact", ctaLabel: "Contact Us" };
  }

  // A `choice` means the visitor tapped one of the AI's clarifying options — fold
  // it into the prompt as context so the model gives a tailored final answer.
  const userContent = choice
    ? `Original question: "${query}"\nThe visitor tapped this option to clarify what they need: "${choice}"\nGive a direct, final answer that routes them to the best way to get this — do not ask another clarifying question.`
    : query;

  try {
    const completion = await openai.chat.completions.create({
      model: SMART_SEARCH_MODEL,
      messages: [
        { role: "system", content: SITE_KNOWLEDGE },
        { role: "user", content: userContent },
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) {
      return { answer: FALLBACK_ANSWERS.empty, page: "/contact", ctaLabel: "Contact Us" };
    }
    return parseAnswer(raw);
  } catch (err) {
    console.error("[smartSearch]", err);
    return { answer: FALLBACK_ANSWERS.unavailable, page: "/contact", ctaLabel: "Contact Us" };
  }
}
