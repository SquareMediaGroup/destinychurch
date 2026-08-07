import { z } from "zod";
import type { BlockDefinition } from "../types";
import FaqBlock, { type FaqProps } from "./FaqBlock";

const faqItemSchema = z.object({
  id: z.string().default(""),
  q: z.string().default(""),
  a: z.string().default(""),
});

export const faqBlock: BlockDefinition<FaqProps> = {
  name: "faq",
  version: 1,
  label: "FAQ",
  icon: "quiz",
  category: "content",
  description: "Collapsible questions and answers.",
  width: "column",

  // Every key carries .default() so content authored before a field existed
  // still parses — see decodeProps in ../serialize.ts.
  schema: z.object({
    eyebrow: z.string().default(""),
    heading: z.string().default(""),
    items: z.array(faqItemSchema).default([]),
    numbered: z.boolean().default(true),
    exclusive: z.boolean().default(true),
    defaultOpen: z.enum(["none", "first"]).default("none"),
    jsonLd: z.boolean().default(true),
  }),

  defaults: {
    eyebrow: "",
    heading: "Frequently asked questions",
    items: [
      { id: "seed-1", q: "What time do services start?", a: "" },
      { id: "seed-2", q: "Where can I park?", a: "" },
    ],
    numbered: true,
    exclusive: true,
    defaultOpen: "none",
    jsonLd: true,
  },

  fields: [
    {
      kind: "text",
      name: "eyebrow",
      label: "Eyebrow",
      placeholder: "Good to know",
      help: "Small orange label above the heading. Leave blank to hide.",
    },
    {
      kind: "text",
      name: "heading",
      label: "Heading",
      placeholder: "Frequently asked questions",
    },
    {
      kind: "repeater",
      name: "items",
      label: "Questions",
      addLabel: "Add question",
      itemDefaults: { q: "", a: "" },
      itemLabel: (item, index) =>
        typeof item.q === "string" && item.q.trim()
          ? item.q
          : `Question ${index + 1}`,
      itemFields: [
        { kind: "text", name: "q", label: "Question" },
        { kind: "textarea", name: "a", label: "Answer", rows: 4 },
      ],
    },
    {
      kind: "toggle",
      name: "numbered",
      label: "Show numbers",
      help: "01, 02, 03 down the left-hand side.",
    },
    {
      kind: "toggle",
      name: "exclusive",
      label: "Only one open at a time",
    },
    {
      kind: "select",
      name: "defaultOpen",
      label: "On page load",
      options: [
        { value: "none", label: "All closed" },
        { value: "first", label: "First one open" },
      ],
    },
    {
      kind: "toggle",
      name: "jsonLd",
      label: "Add search rich-result data",
      help: "Lets Google show these questions directly in search results.",
    },
  ],

  Component: FaqBlock,

  summary: (props) => {
    const count = props.items.filter((item) => item.q.trim()).length;
    return `FAQ · ${count} question${count === 1 ? "" : "s"}`;
  },

  /*
   * Google's FAQ rich-result policy requires the answer to be visible on the
   * page. Collapsed <details> content counts as visible (it's in the DOM and
   * expandable without a network request), so this is legitimate — it would not
   * be if answers were fetched on demand.
   */
  jsonLd: (props) => {
    if (!props.jsonLd) return null;
    const answered = props.items.filter(
      (item) => item.q.trim() && item.a.trim(),
    );
    if (answered.length === 0) return null;
    return {
      "@type": "FAQPage",
      mainEntity: answered.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    };
  },
};
