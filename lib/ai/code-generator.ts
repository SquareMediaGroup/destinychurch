/**
 * Code generator: turns a volunteer's intent into a full Next.js page.tsx file
 * (and optionally new section components) that gets written into the repo.
 */
import type { LLMClient } from "./llm-client";
import type { MediaItem } from "./media-types";
import {
  getComponentCatalog,
  getReferencePages,
  type ComponentInfo,
} from "./code-context";

export interface CodeGenIntent {
  pageType?: string;
  context: string;
  audience?: string;
  media?: MediaItem[];
}

export interface GeneratedFile {
  path: string; // e.g. "app/alpha-september/page.tsx"
  source: string;
}

export interface GeneratedCode {
  title: string;
  slug: string;
  pageFile: GeneratedFile;
  newComponents: GeneratedFile[];
  reasoning: string;
}

interface LLMOutput {
  title: string;
  slug: string;
  reasoning: string;
  page: { source: string };
  newComponents?: Array<{
    category: string;
    name: string;
    source: string;
  }>;
}

function buildSystemPrompt(): string {
  return `You are an expert Next.js (App Router) developer working on a church website.
You write production-ready TypeScript React code that follows the repo's existing conventions.
Always respond with ONLY valid JSON, no markdown code fences, no explanation text outside the JSON.`;
}

function buildUserPrompt(intent: CodeGenIntent, components: ComponentInfo[], references: { route: string; source: string }[]): string {
  const componentList = components
    .map((c) => `  - import ${c.name} from "${c.importPath}";  // ${c.category}`)
    .join("\n");

  const referencesBlock = references
    .map((r) => `### Reference page ${r.route}\n\`\`\`tsx\n${r.source}\n\`\`\``)
    .join("\n\n");

  const mediaBlock = intent.media && intent.media.length > 0
    ? `\nAvailable uploaded media (use these URLs in any new section component you build):\n${intent.media
        .map((m) => `- ${m.mediaType} (${m.purpose}): hero=${m.heroUrl ?? "n/a"} general=${m.generalUrl ?? "n/a"} thumb=${m.thumbnailUrl ?? "n/a"} ${m.externalUrl ? `external=${m.externalUrl}` : ""} desc="${m.description ?? ""}"`)
        .join("\n")}`
    : "";

  return `## Volunteer intent
${intent.context}
${intent.pageType ? `\nPage type: ${intent.pageType}` : ""}
${intent.audience ? `\nTarget audience: ${intent.audience}` : ""}

## Available components (prefer composing these)
${componentList}

## Reference existing pages
${referencesBlock}
${mediaBlock}

## Your task
Generate a new Next.js App Router page at app/<slug>/page.tsx that fulfils the volunteer's intent.

Rules:
1. STRONGLY prefer composing existing components from the catalog above. Only create a new component if no existing one fits.
2. Use the exact import paths shown in the catalog.
3. Include a Next.js \`metadata\` export with title, description, alternates.canonical, and openGraph.
4. Use the same code style as the reference pages (default export function, JSX fragments, no extra wrappers).
5. New components, if any, must:
   - Live under components/<category>/<Name>.tsx where <category> is one of: home, about, alpha, give, serve, visit, missions, new-here, help, whats-on, sermons, youth-alpha, connect-card.
   - Use Tailwind classes consistent with brand: destiny-orange (#f58021), destiny-grey, white backgrounds.
   - Be self-contained (no props) so the page just renders <NewComponent />.
   - Use next/image for any images, with alt text.
6. Slug must be lowercase letters/numbers/hyphens, max 60 chars, not collide with existing routes.
7. Do NOT modify existing files. Only create new ones.

## Output format
Respond with ONLY this JSON shape:
{
  "title": "Human-readable page title",
  "slug": "url-slug",
  "reasoning": "1-3 sentences on why you chose this structure",
  "page": {
    "source": "// Full source of app/<slug>/page.tsx as a string"
  },
  "newComponents": [
    {
      "category": "alpha",
      "name": "AlphaSeptemberCallout",
      "source": "// Full source as a string"
    }
  ]
}

If no new components are needed, return "newComponents": [].`;
}

function stripCodeFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return s.trim();
}

function parseLLMOutput(raw: string): LLMOutput {
  const cleaned = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`LLM did not return valid JSON: ${(err as Error).message}\n\nRaw response:\n${raw.slice(0, 500)}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM response is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title : "";
  const slug = typeof obj.slug === "string" ? obj.slug : "";
  const reasoning = typeof obj.reasoning === "string" ? obj.reasoning : "";
  const page = obj.page as { source?: unknown } | undefined;
  if (!page || typeof page.source !== "string") {
    throw new Error("LLM response missing page.source");
  }
  const newComponentsRaw = Array.isArray(obj.newComponents) ? obj.newComponents : [];
  const newComponents = newComponentsRaw
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      category: String(c.category ?? ""),
      name: String(c.name ?? ""),
      source: String(c.source ?? ""),
    }))
    .filter((c) => c.category && c.name && c.source);

  return {
    title: title || "Untitled Page",
    slug,
    reasoning,
    page: { source: page.source },
    newComponents,
  };
}

export async function generatePageCode(
  intent: CodeGenIntent,
  llm: LLMClient
): Promise<GeneratedCode> {
  const [components, references] = await Promise.all([
    getComponentCatalog(),
    getReferencePages(),
  ]);

  const prompt = buildUserPrompt(intent, components, references);
  // Reuse the same generatePageStructure entrypoint; it sends the system prompt internally
  // but we want a different system prompt for code generation. Inline a richer call:
  const raw = await llm.generatePageStructure(`${buildSystemPrompt()}\n\n${prompt}`);

  const out = parseLLMOutput(raw);

  return {
    title: out.title,
    slug: out.slug,
    reasoning: out.reasoning,
    pageFile: {
      path: `app/${out.slug}/page.tsx`,
      source: out.page.source,
    },
    newComponents: (out.newComponents ?? []).map((c) => ({
      path: `components/${c.category}/${c.name}.tsx`,
      source: c.source,
    })),
  };
}
