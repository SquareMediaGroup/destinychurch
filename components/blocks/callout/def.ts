import { z } from "zod";
import type { BlockDefinition } from "../types";
import { TONE_OPTIONS } from "../tokens";
import CalloutBlock, { type CalloutProps } from "./CalloutBlock";

export const calloutBlock: BlockDefinition<CalloutProps> = {
  name: "callout",
  version: 1,
  label: "Callout",
  icon: "info",
  category: "content",
  description: "A tinted notice panel with an icon.",
  width: "column",

  schema: z.object({
    icon: z.string().default("info"),
    heading: z.string().default(""),
    body: z.string().default(""),
    tone: z.enum(["light", "muted", "orange", "blue", "green", "purple"]).default("orange"),
  }),

  defaults: {
    icon: "info",
    heading: "Good to know",
    body: "",
    tone: "orange",
  },

  fields: [
    { kind: "icon", name: "icon", label: "Icon", help: "Leave blank to hide." },
    { kind: "text", name: "heading", label: "Heading" },
    { kind: "textarea", name: "body", label: "Text", rows: 3 },
    { kind: "tone", name: "tone", label: "Colour", options: TONE_OPTIONS },
  ],

  Component: CalloutBlock,
  summary: (props) => `Callout · ${props.heading || props.tone}`,
};
