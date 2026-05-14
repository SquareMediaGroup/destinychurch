import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPageWithImports } from "@/lib/ai/code-page-source";
import { getLLMClient } from "@/lib/ai/llm-client";

export const runtime = "nodejs";

interface EditableTextOut {
  id: string;
  label: string;
  value: string;
  file: string;
  section: string;
  kind: "heading" | "body" | "cta" | "alt" | "href";
  context: string;
}

function buildPrompt(args: {
  slug: string;
  pageSource: string;
  components: Array<{ path: string; source: string }>;
}): string {
  const componentBlocks = args.components
    .map((c) => `### ${c.path}\n\`\`\`tsx\n${c.source}\n\`\`\``)
    .join("\n\n");

  return `You are reading the TypeScript React source of a Next.js page so a volunteer
can edit its text content in a visual dashboard. Your job is to extract every
user-visible string into a JSON catalog.

The page lives at /${args.slug}. Here is its page.tsx and every component it
imports from @/components/. Some components are shared, hardcoded, and shouldn't
have ANY entries (just skip them). The cloned page-specific components are
where most editable text lives.

## app/${args.slug}/page.tsx
\`\`\`tsx
${args.pageSource}
\`\`\`

${componentBlocks}

## Output

Respond with ONLY valid JSON of the form:
[
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

Include every:
- heading (h1, h2, h3)
- paragraph or body line of copy
- CTA button label
- link label
- image alt text
- CTA href (so volunteers can repoint links)
- metadata title and description (the page's <Metadata> export)

Skip:
- Tailwind class names
- variable names
- aria-hidden="" / decorative alt=""
- metadata.alternates.canonical (auto-managed)
- text inside shared components that have no hardcoded content (they take no props
  so there is nothing to edit)

Rules:
- Each entry MUST have a unique \`id\` in kebab-case
- \`value\` MUST exactly match the source string (no escaping changes)
- \`file\` is the repo-relative path
- \`section\` is a logical group: "Hero", "What is Alpha", "Get Involved", "Metadata", "FAQ", "Team"…
- \`kind\` is one of: heading | body | cta | alt | href
- \`context\` is a 30-80 char unique source snippet containing \`value\` exactly once
- Return ONLY the JSON array, no markdown fences, no commentary`;
}

function parseTextsArray(raw: string): EditableTextOut[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  // Try direct parse, then fall back to find first [...] segment
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("LLM returned no JSON array");
    parsed = JSON.parse(m[0]);
  }
  if (!Array.isArray(parsed)) throw new Error("LLM response is not an array");

  const out: EditableTextOut[] = [];
  const seenIds = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const t = item as Record<string, unknown>;
    const id = String(t.id ?? "");
    const value = String(t.value ?? "");
    if (!id || !value) continue;
    if (seenIds.has(id)) continue;
    const kind = String(t.kind ?? "body") as EditableTextOut["kind"];
    out.push({
      id,
      label: String(t.label ?? id),
      value,
      file: String(t.file ?? ""),
      section: String(t.section ?? "General"),
      kind: ["heading", "body", "cta", "alt", "href"].includes(kind) ? kind : "body",
      context: String(t.context ?? ""),
    });
    seenIds.add(id);
  }
  return out;
}

/**
 * POST /api/admin/builder/code/[id]/extract-texts
 * Asks the LLM to read the page's source files and produce an editable_texts
 * catalog. Stores it on the row so the visual editor has something to edit.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAuth = createClient(await cookies());
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: row, error: loadError } = await supabase
    .from("builder_pages")
    .select("id, slug, source_type, source_path")
    .eq("id", id)
    .single();
  if (loadError || !row) {
    return NextResponse.json(
      { error: loadError?.message ?? "Page not found" },
      { status: 404 }
    );
  }
  if (row.source_type !== "code") {
    return NextResponse.json(
      { error: "Can only extract texts from code-source pages" },
      { status: 400 }
    );
  }

  let bundle;
  try {
    bundle = await readPageWithImports(row.slug);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to read source files: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }

  const llm = getLLMClient();
  let texts: EditableTextOut[];
  try {
    const prompt = buildPrompt({
      slug: row.slug,
      pageSource: bundle.pageSource,
      components: bundle.components,
    });
    const raw = await llm.generatePageStructure(prompt);
    texts = parseTextsArray(raw);
  } catch (err) {
    return NextResponse.json(
      {
        error: `LLM extraction failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      },
      { status: 502 }
    );
  }

  const { error: updateError } = await supabase
    .from("builder_pages")
    .update({
      editable_texts: texts,
      status: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json(
      { error: `Failed to save catalog: ${updateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    count: texts.length,
    sections: Array.from(new Set(texts.map((t) => t.section))),
  });
}
