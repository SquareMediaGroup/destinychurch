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
import { type BlockKind, BLOCK_AI_GUIDE } from "./skeleton-types";

export interface CodeGenIntent {
  pageType?: string;
  context: string;
  audience?: string;
  media?: MediaItem[];
  requestedSlug?: string; // if provided, AI must use this exact slug (overwrites existing route)
  /**
   * Ordered list of block kinds from the Skeleton sketcher. When present, the AI
   * MUST follow this section order exactly when generating the page.
   */
  layout?: BlockKind[];
}

export interface GeneratedFile {
  path: string; // e.g. "app/alpha-september/page.tsx"
  source: string;
}

/**
 * One editable user-facing text that lives inside a generated source file.
 * The dashboard renders one form field per entry. On save, the workflow does
 * a first-occurrence find-and-replace inside `file` to swap `value` for the new value.
 */
export interface EditableText {
  /** Stable id ("hero-title", "cta-1-label"). Used by the editor to track fields across edits. */
  id: string;
  /** Human label rendered in the dashboard. */
  label: string;
  /** The exact current text content as it appears in the source file. */
  value: string;
  /** Repo-relative file path the text lives in. */
  file: string;
  /** Section/component name for grouping. */
  section: string;
  /** "heading" | "body" | "cta" | "alt" | "href" — informs the field renderer. */
  kind: "heading" | "body" | "cta" | "alt" | "href";
  /**
   * 30-80 char unique substring of the file source that contains `value` exactly once.
   * Used to disambiguate when the same text appears more than once.
   */
  context: string;
}

export interface GeneratedCode {
  title: string;
  slug: string;
  pageFile: GeneratedFile;
  newComponents: GeneratedFile[];
  reasoning: string;
  editableTexts: EditableText[];
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
  editableTexts?: EditableText[];
}

function buildSystemPrompt(): string {
  return `You are an expert Next.js (App Router) developer working on a church website.
You write production-ready TypeScript React code that follows the repo's existing conventions.
Always respond with ONLY valid JSON, no markdown code fences, no explanation text outside the JSON.
Your code MUST type-check with strict TypeScript on the first try.`;
}

// Categorise components into "templates" (Hero variants and reusable sections)
// vs "as-is" (no-prop sections that should be referenced verbatim).
function buildComponentSection(components: ComponentInfo[]): string {
  // Group by category
  const byCategory = new Map<string, ComponentInfo[]>();
  for (const c of components) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category)!.push(c);
  }

  const lines: string[] = [];
  for (const [cat, list] of byCategory) {
    lines.push(`\n### ${cat}/`);
    for (const c of list) {
      const propsLabel = c.acceptsProps ? "props=YES" : "props=NO (hardcoded — clone to customise)";
      const clientLabel = c.isClient ? " [client]" : "";
      lines.push(`\n#### ${c.name} — ${propsLabel}${clientLabel}`);
      lines.push(`Import: \`import ${c.name} from "${c.importPath}";\``);
      lines.push("```tsx");
      lines.push(c.source);
      lines.push("```");
    }
  }
  return lines.join("\n");
}

function buildMediaSection(media?: MediaItem[]): string {
  if (!media || media.length === 0) {
    return `\n## Media
The volunteer did not upload any photos or videos. Use brand assets from /public/img/ that already appear in reference pages, OR write the page without imagery if none fits.`;
  }

  const lines: string[] = [];
  lines.push(`\n## Media (USE THESE — the volunteer uploaded them for THIS page)`);
  lines.push("");
  for (let i = 0; i < media.length; i++) {
    const m = media[i];
    if (m.mediaType === "image") {
      lines.push(`### Image ${i + 1} — purpose: ${m.purpose}`);
      lines.push(`- Description: ${m.description || "(none)"}`);
      lines.push(`- Alt text: ${m.altText || m.description || "Photo"}`);
      lines.push(`- Hero variant (1920x1080): ${m.heroUrl ?? "n/a"}`);
      lines.push(`- General variant (800x600): ${m.generalUrl ?? "n/a"}`);
      lines.push(`- Thumbnail (400x300): ${m.thumbnailUrl ?? "n/a"}`);
      if (m.width && m.height) {
        lines.push(`- Original dimensions: ${m.width} x ${m.height}`);
      }
    } else {
      lines.push(`### Video ${i + 1} — purpose: ${m.purpose}, source: ${m.sourceType}`);
      lines.push(`- Description: ${m.description || "(none)"}`);
      lines.push(`- URL: ${m.externalUrl ?? "n/a"}`);
    }
    lines.push("");
  }

  lines.push(`### How to use these URLs in code

For IMAGES — always use \`next/image\`:
\`\`\`tsx
import Image from "next/image";

// Hero/full-bleed background:
<Image
  src="HERO_URL_FROM_ABOVE"
  alt="Alt text from above"
  fill
  priority
  sizes="100vw"
  className="object-cover"
/>

// Inline content image (use width+height when known, otherwise fill+sizes):
<Image
  src="GENERAL_URL_FROM_ABOVE"
  alt="Alt text"
  width={800}
  height={600}
  className="rounded-2xl object-cover"
/>
\`\`\`

For VIDEOS:
- YouTube: \`<iframe src="https://www.youtube.com/embed/VIDEO_ID" allowFullScreen className="aspect-video w-full" />\` (extract VIDEO_ID from the URL)
- Vimeo: \`<iframe src="https://player.vimeo.com/video/VIDEO_ID" allowFullScreen className="aspect-video w-full" />\`
- Direct .mp4/.webm: \`<video src="URL" controls className="w-full" />\` (or autoPlay muted loop playsInline for backgrounds)

CRITICAL RULES:
1. EVERY image MUST have a non-empty \`alt\` attribute (use the alt text or description above; empty string only for decorative backgrounds with \`aria-hidden\`).
2. NEVER make up image URLs. Only use the URLs listed above OR the existing /img/... paths visible in reference pages.
3. Match purpose to placement: "hero" purpose → hero/header section, "team" → people sections, "event" → event cards, "ministry" → ministry tiles, "background" → section backgrounds, "general" → inline content.
4. The Supabase image domain is already in next.config.ts \`remotePatterns\` — these URLs WILL work with next/image.`);

  return lines.join("\n");
}

function buildLayoutSection(layout?: BlockKind[]): string {
  if (!layout || layout.length === 0) return "";
  const lines = layout.map(
    (kind, i) =>
      `${i + 1}. ${BLOCK_AI_GUIDE[kind].label} — ${BLOCK_AI_GUIDE[kind].guidance}`
  );
  return `\n## REQUIRED layout (from the volunteer's skeleton sketch)

The volunteer sketched the section order they want. Build the page with these
sections, in this order, no more, no less. Treat this as authoritative — do
NOT add an extra hero, do NOT skip blocks, do NOT reorder. Each numbered item
must map to one section on the final page:

${lines.join("\n")}

If the volunteer's free-form description suggests additional sections, fold
that material INTO one of the blocks above rather than adding new sections.
The free-form description still drives the copy, tone, and CTAs.`;
}

function buildUserPrompt(intent: CodeGenIntent, components: ComponentInfo[], references: { route: string; source: string }[]): string {
  const componentSection = buildComponentSection(components);
  const referencesBlock = references
    .map((r) => `### Reference page ${r.route}\n\`\`\`tsx\n${r.source}\n\`\`\``)
    .join("\n\n");
  const mediaSection = buildMediaSection(intent.media);
  const layoutSection = buildLayoutSection(intent.layout);

  const slugDirective = intent.requestedSlug
    ? `\n\nIMPORTANT: The slug MUST be exactly "${intent.requestedSlug}". Do not change it. This may overwrite an existing page at /${intent.requestedSlug} — that is intentional and approved by the volunteer.`
    : "";

  return `## Volunteer intent
${intent.context}
${intent.pageType ? `\nPage type: ${intent.pageType}` : ""}
${intent.audience ? `\nTarget audience: ${intent.audience}` : ""}${slugDirective}
${layoutSection}

## Available components
Below is the FULL source of every reusable component, grouped by category.
Each is labelled \`props=YES\` (accepts props you can pass) or \`props=NO\` (hardcoded — passing props will fail TypeScript).
${componentSection}

## Reference existing pages
${referencesBlock}
${mediaSection}

## Your task
Generate a new Next.js App Router page at \`app/<slug>/page.tsx\` that fulfils the volunteer's intent.

## How to choose between using and cloning a component

The catalog above contains finished, hardcoded sections (Hero, Mission, EveryoneHasAPlace, etc.). Each one is labelled \`props=NO\` because it ships with its own copy/CTA/imagery baked in. You have THREE patterns to follow:

### Pattern A — render an existing component as-is (preferred when copy fits)
If the volunteer's intent works with the EXISTING text and imagery of a section (e.g. they want the standard "Worship With Us" CTA, or "Everyone Has A Place" tiles unchanged), just import and render it: \`<WorshipWithUsSection />\`. Pass NO props.

### Pattern B — CLONE an existing component as a new file (THIS IS THE NORMAL CASE for Hero and any section that needs new copy/CTA/image)
This is what the volunteer expects most of the time. The Hero looks the same on every page — only the text, CTAs and background image change. So:
1. Pick the closest existing template from the catalog (e.g. \`HeroSection\` from home, or \`AboutHero\` from about).
2. Create a NEW component file under \`components/<category>/<NewName>.tsx\` (e.g. \`components/alpha/AlphaSeptemberHero.tsx\`).
3. Copy the JSX, Tailwind classes, fonts, gradients, animations and overall layout EXACTLY.
4. Change ONLY:
   - The headline / subhead / body text
   - The CTA button labels and \`href\`s
   - The background image \`src\` (use a media URL the volunteer uploaded; otherwise keep the original /img/... path the template uses)
   - Optionally: the brand-coloured accents (keep destiny-orange #f58021 unless intent suggests otherwise)
5. The new component must be self-contained with NO props (just \`export default function NewName() { ... }\`).
6. Render it on the page: \`<AlphaSeptemberHero />\`.

DO THE SAME for non-hero sections when they need different copy: clone \`MissionSection\` → \`AlphaWhyComeSection\` etc.

### Pattern C — write a brand-new section
Only do this if NO existing component is structurally close. Match the brand: destiny-orange CTAs, destiny-grey body text, white or destiny-grey backgrounds, Tailwind spacing scale, \`AnimateIn\` for entry animations (\`import AnimateIn from "@/components/AnimateIn";\`), \`next/image\` for images, semantic HTML, no inline styles unless the reference pages use them.

## Hard rules to avoid TypeScript failures (READ CAREFULLY)

1. NEVER pass props to a component labelled \`props=NO\`. \`<HeroSection title="X" />\` will FAIL the build because HeroSection accepts no arguments. If you need different content, follow Pattern B (clone).
2. Every \`<Image>\` from \`next/image\` MUST have an \`alt\` attribute (string, can be empty for decorative). MUST have either \`fill\` or both \`width\` and \`height\`.
3. Every imported component, hook, or utility must actually exist. Do not invent imports. Only import:
   - From the catalog above using its exact \`importPath\`.
   - From \`next/image\`, \`next/link\`, \`next\` (for \`Metadata\` type), \`react\`.
   - \`@/components/AnimateIn\` (entry animations).
   - From a NEW component file you are creating in the same response.
4. The page file must use \`export default function PageName()\` (no props), and may include \`export const metadata: Metadata = {...}\`.
5. If you use React hooks (\`useState\`, \`useEffect\`, \`useCallback\`) in a NEW component, that component file MUST start with \`"use client";\` as the first line. The page file (\`app/<slug>/page.tsx\`) should stay a server component (no \`"use client"\`) so it can export metadata.
6. Do not use \`any\`, do not use \`@ts-ignore\`, do not use unused imports.
7. Do not create files outside \`app/<slug>/\` and \`components/<category>/\`. Categories allowed: home, about, alpha, give, serve, visit, missions, new-here, help, whats-on, sermons, youth-alpha, connect-card.
8. New component file names must be PascalCase (\`AlphaLaunchHero\`), no spaces, no hyphens.
9. Slug must match \`^[a-z0-9][a-z0-9-]{0,60}$\`.

## Output format
Respond with ONLY this JSON (no markdown fences, no commentary):
{
  "title": "Human-readable page title",
  "slug": "url-slug",
  "reasoning": "ONE sentence (max 200 chars) on which template you cloned and why. Plain text only. No quotes, no newlines.",
  "page": {
    "source": "// Full TypeScript source of app/<slug>/page.tsx as a single string with \\n escapes"
  },
  "newComponents": [
    {
      "category": "alpha",
      "name": "AlphaLaunchHero",
      "source": "// Full TypeScript source of the new component as a single string with \\n escapes"
    }
  ],
  "editableTexts": [
    {
      "id": "hero-title",
      "label": "Hero headline",
      "value": "Alpha is for Everyone",
      "file": "components/alpha/AlphaLaunchHero.tsx",
      "section": "Hero",
      "kind": "heading",
      "context": "<h1 className=\\"...\\">Alpha is for Everyone</h1>"
    }
  ]
}

If no new components are needed, return "newComponents": [].

## editableTexts catalog (REQUIRED)
You MUST list EVERY user-visible text string in the page and the new components.
The dashboard uses this list to build a visual editor where volunteers can update
copy without writing code. Include:
- Every heading (h1, h2, h3) text
- Every paragraph or body copy line
- Every CTA button label
- Every link label
- Every image alt text
- Every CTA href (so volunteers can repoint links)
- Every metadata title and description (the page's <Metadata> export)

Do NOT include:
- Tailwind class names
- Variable names
- Internal labels (e.g. \`aria-hidden=""\`, \`alt=""\` on decorative images)
- The \`metadata.alternates.canonical\` URL (auto-managed)

Each entry must:
- Have a unique \`id\` (kebab-case: hero-title, hero-cta-1, mission-body)
- Have a \`label\` ("Hero headline", "First CTA button label", "Section 2 paragraph")
- Have a \`value\` that EXACTLY matches the string as it appears in the source (escape \\n inside strings only — JSX text content rarely has newlines)
- Set \`file\` to the repo-relative path where the text lives
- Set \`section\` to a logical group ("Hero", "Mission", "Get Involved", "Metadata", "FAQ")
- Set \`kind\` to one of: heading | body | cta | alt | href
- Set \`context\` to a short 30-80 char snippet of the surrounding source that contains \`value\` exactly once. Use literal source characters (curly braces are fine; \\" only when inside a JSON string). The snippet is used to disambiguate identical strings, so make it unique.`;
}

function stripCodeFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return s.trim();
}

function tryRepairJson(s: string): string | null {
  // Salvage common truncation issues: response was cut off mid-string/object.
  let str = s.trim();

  let depth = 0;
  let inString = false;
  let escape = false;
  let lastSafePos = -1;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) lastSafePos = i;
    }
  }

  if (lastSafePos > 0) {
    return str.slice(0, lastSafePos + 1);
  }
  return null;
}

function parseLLMOutput(raw: string): LLMOutput {
  const cleaned = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const repaired = tryRepairJson(cleaned);
    if (repaired) {
      try {
        parsed = JSON.parse(repaired);
        console.warn("⚠ LLM response was truncated; salvaged with JSON repair");
      } catch {
        throw new Error(
          `LLM did not return valid JSON (repair failed): ${(err as Error).message}\n\nLast 500 chars:\n${raw.slice(-500)}`
        );
      }
    } else {
      throw new Error(
        `LLM did not return valid JSON: ${(err as Error).message}\n\nFirst 300 chars:\n${raw.slice(0, 300)}\n\nLast 300 chars:\n${raw.slice(-300)}`
      );
    }
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

  const editableTextsRaw = Array.isArray(obj.editableTexts) ? obj.editableTexts : [];
  const editableTexts: EditableText[] = editableTextsRaw
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t) => {
      const kind = String(t.kind ?? "body") as EditableText["kind"];
      return {
        id: String(t.id ?? ""),
        label: String(t.label ?? ""),
        value: String(t.value ?? ""),
        file: String(t.file ?? ""),
        section: String(t.section ?? "General"),
        kind: ["heading", "body", "cta", "alt", "href"].includes(kind) ? kind : "body",
        context: String(t.context ?? ""),
      };
    })
    .filter((t) => t.id && t.label && t.value && t.file);

  return {
    title: title || "Untitled Page",
    slug,
    reasoning,
    page: { source: page.source },
    newComponents,
    editableTexts,
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
  const raw = await llm.generatePageStructure(`${buildSystemPrompt()}\n\n${prompt}`);

  const out = parseLLMOutput(raw);
  const finalSlug = intent.requestedSlug?.trim() || out.slug;
  const pagePath = `app/${finalSlug}/page.tsx`;

  // Rewrite editable text file references that point to the page file
  // to match the final slug (the AI may have used a placeholder slug).
  const editableTexts = (out.editableTexts ?? []).map((t) => {
    if (t.file.startsWith("app/") && t.file.endsWith("/page.tsx")) {
      return { ...t, file: pagePath };
    }
    return t;
  });

  return {
    title: out.title,
    slug: finalSlug,
    reasoning: out.reasoning,
    pageFile: {
      path: pagePath,
      source: out.page.source,
    },
    newComponents: (out.newComponents ?? []).map((c) => ({
      path: `components/${c.category}/${c.name}.tsx`,
      source: c.source,
    })),
    editableTexts,
  };
}

/**
 * Repair a previous generation that failed type-checking.
 * Sends the existing files + the tsc error output back to the LLM and asks
 * it to return the same JSON shape, with the errors fixed.
 */
export async function repairGeneratedCode(
  previous: GeneratedCode,
  typeCheckOutput: string,
  llm: LLMClient
): Promise<GeneratedCode> {
  const componentBlocks = previous.newComponents
    .map(
      (c) => `### Existing new component at \`${c.path}\`
\`\`\`tsx
${c.source}
\`\`\``
    )
    .join("\n\n");

  // Trim tsc output to the relevant errors only (avoid blowing the context).
  const relevantErrors = typeCheckOutput
    .split("\n")
    .filter((line) => {
      // Keep lines mentioning the new files or generic tsc error format.
      const mentionsNew = previous.newComponents.some((c) =>
        line.includes(c.path)
      );
      return mentionsNew || line.includes(previous.pageFile.path) || /error TS\d+/.test(line);
    })
    .slice(0, 80) // cap to 80 lines
    .join("\n");

  const prompt = `${buildSystemPrompt()}

The previous code generation FAILED TypeScript type-checking.
Your job is to return the SAME JSON shape with the errors fixed.

## Error output from \`tsc --noEmit\`
\`\`\`
${relevantErrors || typeCheckOutput.slice(-3000)}
\`\`\`

## The page file at \`${previous.pageFile.path}\`
\`\`\`tsx
${previous.pageFile.source}
\`\`\`

${componentBlocks}

## Common causes to check
- Passed props to a no-prop component (e.g. \`<HeroSection title="X" />\` when HeroSection takes no args). FIX: clone the component as a new file with the new copy baked in.
- Imported a component that doesn't exist. FIX: remove the import or replace with a real one.
- Missing \`alt\` on \`<Image>\`. FIX: add a non-empty alt attribute.
- Used \`useState\`/\`useEffect\` in a server component. FIX: add \`"use client";\` as the first line of the component file.
- Used \`metadata\` export in a client component. FIX: keep page.tsx as a server component, move interactive UI to a client component.
- Wrong import path. FIX: use \`@/components/<category>/<Name>\`.

## Output format
Return the COMPLETE, fixed code as JSON in the same shape:
{
  "title": "...",
  "slug": "${previous.slug}",
  "reasoning": "...",
  "page": { "source": "..." },
  "newComponents": [{ "category": "...", "name": "...", "source": "..." }]
}

Keep the same slug "${previous.slug}". Return ONLY the JSON, no markdown.`;

  const raw = await llm.generatePageStructure(prompt);
  const out = parseLLMOutput(raw);

  return {
    title: out.title || previous.title,
    slug: previous.slug,
    reasoning: out.reasoning,
    pageFile: {
      path: `app/${previous.slug}/page.tsx`,
      source: out.page.source,
    },
    newComponents: (out.newComponents ?? []).map((c) => ({
      path: `components/${c.category}/${c.name}.tsx`,
      source: c.source,
    })),
    // On a repair pass, keep the previous catalog if the LLM didn't return a new one
    editableTexts: out.editableTexts && out.editableTexts.length > 0
      ? out.editableTexts
      : previous.editableTexts,
  };
}
