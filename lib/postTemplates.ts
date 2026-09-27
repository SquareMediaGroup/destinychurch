// Starter layouts for new posts. Each is ordinary post content — HTML with
// serialised blocks — plus page settings, so a template is only a head start:
// once created, the post is edited like any other. Built from each block's own
// defaults so a template can't drift out of a block's schema.
import { BLOCKS } from "@/components/blocks/registry";
import { encodeProps } from "@/components/blocks/serialize";
import type { PostFields } from "@/lib/posts";

function block(name: string, props: Record<string, unknown> = {}): string {
  const def = BLOCKS[name];
  const merged = { ...(def.defaults as Record<string, unknown>), ...props };
  // The editor's DOM serialiser escapes & and " in attributes; match it.
  const attr = encodeProps(merged).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<div data-block="${name}" data-block-version="${def.version}" data-props="${attr}"></div>`;
}

export interface PostTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  fields: Partial<PostFields>;
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: "blank",
    label: "Blank page",
    description: "Start from nothing.",
    icon: "draft",
    fields: {},
  },
  {
    id: "event",
    label: "Event",
    description: "Photo header, key details, FAQ and a sign-up button.",
    icon: "event",
    fields: {
      hero_style: "image",
      body: [
        "<p>Tell people what's happening and why they should come.</p>",
        block("card-grid", {
          heading: "The details",
          columns: "3",
          items: [
            { id: "when", icon: "schedule", title: "When", body: "", href: "" },
            { id: "where", icon: "location_on", title: "Where", body: "", href: "" },
            { id: "who", icon: "group", title: "Who", body: "", href: "" },
          ],
        }),
        block("buttons", {
          items: [{ id: "signup", label: "Sign up", href: "", style: "primary", icon: "" }],
        }),
        block("faq"),
      ].join(""),
    },
  },
  {
    id: "campaign",
    label: "Campaign",
    description: "Bold banner, a clear message and one call to action.",
    icon: "campaign",
    fields: {
      hero_style: "banner",
      show_rails: false,
      body: [
        "<h2>The big idea</h2><p>One or two sentences on what this is and why it matters.</p>",
        block("callout", { icon: "favorite", heading: "Get involved", tone: "orange" }),
        block("buttons", {
          align: "center",
          items: [{ id: "cta", label: "Get started", href: "", style: "primary", icon: "" }],
        }),
      ].join(""),
    },
  },
  {
    id: "info",
    label: "Info + FAQ",
    description: "Plain page with an intro, a note and common questions.",
    icon: "help",
    fields: {
      body: [
        "<p>Start with a short introduction.</p>",
        block("callout"),
        block("faq"),
      ].join(""),
    },
  },
];
