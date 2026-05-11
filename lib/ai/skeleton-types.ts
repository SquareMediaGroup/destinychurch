/**
 * Block kinds used by both the Skeleton sketcher UI and the AI generator.
 * Kept in a separate file so server-side code (the generator prompt, the
 * workflow script) can import the type and the kind→description mapping
 * without pulling in client-only React code.
 */

export type BlockKind =
  | "hero"
  | "heading"
  | "content"
  | "image"
  | "video"
  | "churchsuite-form"
  | "cta"
  | "gallery"
  | "testimonial"
  | "faq"
  | "team"
  | "spacer";

export const ALL_BLOCK_KINDS: BlockKind[] = [
  "hero",
  "heading",
  "content",
  "image",
  "video",
  "churchsuite-form",
  "cta",
  "gallery",
  "testimonial",
  "faq",
  "team",
  "spacer",
];

export function isBlockKind(value: string): value is BlockKind {
  return (ALL_BLOCK_KINDS as string[]).includes(value);
}

/**
 * Parse a comma-separated `?layout=` URL parameter into a validated list of
 * block kinds. Unknown kinds and empty entries are dropped.
 */
export function parseLayoutParam(raw: string | null | undefined): BlockKind[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is BlockKind => isBlockKind(s))
    .slice(0, 30);
}

/**
 * Volunteer-friendly description used in the AI prompt to explain what each
 * block kind should produce.
 */
export const BLOCK_AI_GUIDE: Record<BlockKind, { label: string; guidance: string }> = {
  hero: {
    label: "Hero",
    guidance:
      "Full-bleed hero at the top of the page. Clone the closest existing hero template and rewrite the headline, subhead and CTAs to fit the volunteer's intent.",
  },
  heading: {
    label: "Heading",
    guidance:
      "A standalone section heading (h2) introducing the next block. Keep it short — 3–6 words.",
  },
  content: {
    label: "Content",
    guidance:
      "Rich text section: a heading and 1–3 paragraphs of body copy. Use the brand typography and a white or light background.",
  },
  image: {
    label: "Image",
    guidance:
      "Large inline image with a short caption underneath. Use next/image with the volunteer's uploaded media when available, otherwise an existing /img/... asset.",
  },
  video: {
    label: "Video",
    guidance:
      "Embedded video. Use a YouTube iframe (https://www.youtube.com/embed/<id>) or Vimeo iframe if a YouTube/Vimeo URL was uploaded; otherwise a <video> tag for a direct .mp4. 16:9 aspect ratio.",
  },
  "churchsuite-form": {
    label: "ChurchSuite Form",
    guidance:
      "Render an embedded ChurchSuite form. Import ChurchSuiteEmbed from \"@/components/ChurchSuiteEmbed\" and pass src and title props. If the volunteer didn't supply a form URL, use \"https://destinytees.churchsuite.com/embed/forms/REPLACE_ME\" as a placeholder src — the volunteer will edit this URL via the visual text editor afterwards.",
  },
  cta: {
    label: "Call to action",
    guidance:
      "A prominent call-to-action band: a short heading, one supporting line, and 1–2 buttons. Use destiny-orange for the primary button.",
  },
  gallery: {
    label: "Gallery",
    guidance:
      "A grid of 3–6 photos. Use next/image with rounded corners. Each image needs alt text.",
  },
  testimonial: {
    label: "Testimonial",
    guidance:
      "A pull quote with attribution (name, role). Keep the layout clean and centred.",
  },
  faq: {
    label: "FAQ",
    guidance:
      "A simple FAQ list — 3–6 question/answer pairs as <details>/<summary> for accessibility.",
  },
  team: {
    label: "Team / Pastors",
    guidance:
      "A row of 2–4 people with circular headshot, name, and role. Use existing team photos from /img/brand/Team/ if available.",
  },
  spacer: {
    label: "Spacer",
    guidance:
      "An empty section providing vertical breathing room. Use py-16 and no content.",
  },
};
