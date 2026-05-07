import { ELEMENT_REGISTRY } from "@/lib/builder/registry";
import { PROPS_SCHEMAS, validateComponentProps } from "@/lib/builder/props-schema";
import type { BuilderElement, ElementType } from "@/lib/builder/types";

export interface PageIntent {
  pageType: string; // "alpha", "about", "giving", etc.
  context: string; // Free-form volunteer description
  audience?: string; // "students", "young adults", etc.
  urgency?: "standard" | "immediate";
}

export interface GeneratedPage {
  title: string;
  slug: string;
  elements: BuilderElement[];
  reasoning?: string;
}

export interface LLMClient {
  generatePageStructure(prompt: string): Promise<string>;
}

// Build a comprehensive prompt for the LLM about available components
function buildComponentContext(): string {
  const brandComponents = ELEMENT_REGISTRY.filter((m) => m.category === "Brand");

  const componentDescriptions = brandComponents
    .map((comp) => {
      const aiHints = comp.aiHints ? ` (use for: ${comp.aiHints.useFor.join(", ")})` : "";
      return `- ${comp.type}: ${comp.description}${aiHints}`;
    })
    .join("\n");

  return `Available semantic components:
${componentDescriptions}

Design system constraints:
- Colors: destiny-orange (#f58021) for CTAs, destiny-grey (#363f48) for text, white backgrounds
- Typography: Roboto for body, Arial/Helvetica Neue for headings, Anton for hero overlays
- Spacing: Use Tailwind scale (mt-8, px-6, py-12, gap-4, etc.)
- Responsive: layouts must work at sm (640px), md (768px), and lg (1024px) breakpoints

Important rules:
1. Use ONLY the semantic components listed above
2. Respect the design system colors and typography
3. Arrange components in a logical flow: Hero → Context → CTA → Engagement
4. Generate valid JSON that matches the BuilderElement structure
5. Each component should have appropriate props
6. DO NOT invent custom HTML or CSS`;
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Parse JSON-like content from LLM response
function extractJSON(text: string): unknown[] {
  // Try to find JSON array in the response
  const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Fall through to manual parsing
    }
  }

  // Fallback: try to extract object patterns
  try {
    // Look for markdown code block
    const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      return JSON.parse(codeMatch[1]);
    }
  } catch {
    // Continue to next attempt
  }

  // If all else fails, return mock structure
  throw new Error("Could not parse JSON from LLM response");
}

// Validate that elements use only registered components
function validateElements(elements: unknown[]): void {
  const validTypes = new Set(ELEMENT_REGISTRY.map((m) => m.type)) as Set<string>;

  if (!Array.isArray(elements)) {
    throw new Error("Elements must be an array");
  }

  for (const el of elements) {
    if (typeof el !== "object" || el === null) {
      throw new Error("Each element must be an object");
    }

    const element = el as Record<string, unknown>;
    const type = element.type as string;

    if (!validTypes.has(type)) {
      throw new Error(
        `Unknown component type: ${type}. Valid types: ${Array.from(validTypes).join(", ")}`
      );
    }
  }
}

// Create default layout for an element
function getDefaultLayout(type: ElementType) {
  const defaults: Record<string, Partial<BuilderElement["layout"]>> = {
    // Full-width sections
    HeroSection: { width: "full", marginBottom: 0, paddingX: 0, paddingY: 12 },
    MissionSection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    WhatsOnSection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    WorshipWithUsSection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    GetInvolvedSection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    LatestSermonSection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    EveryoneHasAPlaceSection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    AboutHero: { width: "full", marginBottom: 0, paddingX: 0, paddingY: 12 },
    AboutMissionStatement: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    AboutMissionCard: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    BeliefsSection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    MeetPastorsSection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    TeamSection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    MagnifySection: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },
    MinistriesGrid: { width: "full", marginBottom: 4, paddingX: 6, paddingY: 8 },

    // Primitives default to contained
    text: { width: "full", marginBottom: 2 },
    heading: { width: "full", marginBottom: 2 },
    image: { width: "full", marginBottom: 2 },
    button: { width: "auto", marginBottom: 2 },
  };

  return defaults[type] || { width: "full", marginBottom: 2 };
}

// Transform parsed elements into proper BuilderElement structure
function transformElements(rawElements: unknown[]): BuilderElement[] {
  validateElements(rawElements);

  return (rawElements as Record<string, unknown>[]).map((el, index) => {
    const typeString = String(el.type) as ElementType;
    const props = el.props || {};

    // Validate props against schema if available
    let validatedProps = props;
    const schemaKey = typeString as keyof typeof PROPS_SCHEMAS;
    if (schemaKey in PROPS_SCHEMAS) {
      try {
        validatedProps = validateComponentProps(schemaKey, props);
      } catch (error) {
        console.warn(`Props validation failed for ${typeString}:`, error);
        // Use props as-is if validation fails
      }
    }

    return {
      id: `el-${Date.now()}-${index}`,
      type: typeString,
      props: validatedProps as Record<string, unknown>,
      layout: getDefaultLayout(typeString),
      children: el.children as BuilderElement[] | undefined,
    };
  });
}

/**
 * Generate a page structure from volunteer intent
 */
export async function generatePageFromIntent(
  intent: PageIntent,
  llmClient: LLMClient
): Promise<GeneratedPage> {
  // Build the LLM prompt
  const componentContext = buildComponentContext();

  const systemPrompt = `You are an expert church website designer. Your job is to create page structures for a church website using pre-built semantic components.

${componentContext}

You MUST respond with ONLY valid JSON (no markdown, no explanation, just the JSON array).`;

  const userPrompt = `Create a page structure for:
Page type: ${intent.pageType}
Audience: ${intent.audience || "general"}
Context: ${intent.context}
${intent.urgency === "immediate" ? "Urgency: Create something immediately useful" : ""}

Return ONLY a JSON array of page elements. Each element should have:
{
  "type": "ComponentType",
  "props": { /* component-specific props */ }
}

Example:
[
  {
    "type": "HeroSection",
    "props": {
      "title": "...",
      "subtitle": "...",
      "ctas": [{"label": "...", "href": "..."}]
    }
  },
  {
    "type": "GetInvolvedSection",
    "props": {...}
  }
]`;

  // Call LLM
  let llmResponse: string;
  try {
    llmResponse = await llmClient.generatePageStructure(userPrompt);
  } catch (error) {
    throw new Error(`LLM call failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Parse response
  let rawElements: unknown[];
  try {
    rawElements = extractJSON(llmResponse);
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Transform into proper BuilderElements
  let elements: BuilderElement[];
  try {
    elements = transformElements(rawElements);
  } catch (error) {
    throw new Error(
      `Failed to transform elements: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Generate metadata
  const title = `${intent.pageType.charAt(0).toUpperCase() + intent.pageType.slice(1)} ${
    intent.audience ? `- ${intent.audience}` : ""
  }`.trim();
  const slug = generateSlug(title);

  return {
    title,
    slug,
    elements,
    reasoning: `Generated for ${intent.pageType} page targeting ${intent.audience || "general"} audience`,
  };
}

/**
 * Suggest a single component to add to an existing page
 */
export async function suggestSectionForPage(
  pageContext: {
    pageType: string;
    currentElements: BuilderElement[];
    description: string;
  },
  llmClient: LLMClient
): Promise<BuilderElement> {
  const currentTypes = pageContext.currentElements.map((el) => el.type).join(", ");

  const prompt = `Given a page structure for a ${pageContext.pageType} page with components: ${currentTypes}

User request: ${pageContext.description}

Suggest ONE component to add next. Respond with ONLY valid JSON (no markdown):
{
  "type": "ComponentType",
  "props": { /* props */ },
  "reasoning": "why this component works"
}`;

  const llmResponse = await llmClient.generatePageStructure(prompt);

  const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse suggested section from LLM response");
  }

  const suggested = JSON.parse(jsonMatch[0]);
  const element = transformElements([suggested])[0];

  return element;
}
