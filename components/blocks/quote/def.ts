import { z } from "zod";
import type { BlockDefinition } from "../types";
import QuoteBlock, { type QuoteProps } from "./QuoteBlock";

export const quoteBlock: BlockDefinition<QuoteProps> = {
  name: "quote",
  version: 1,
  label: "Quote",
  icon: "format_quote",
  category: "content",
  description: "A pull quote or testimonial.",
  width: "column",

  schema: z.object({
    quote: z.string().default(""),
    attribution: z.string().default(""),
    role: z.string().default(""),
    align: z.enum(["left", "center"]).default("left"),
  }),

  defaults: { quote: "", attribution: "", role: "", align: "left" },

  fields: [
    { kind: "textarea", name: "quote", label: "Quote", rows: 4 },
    { kind: "text", name: "attribution", label: "Who said it" },
    {
      kind: "text",
      name: "role",
      label: "Their role",
      help: "Optional, e.g. \"Youth leader\".",
    },
    {
      kind: "select",
      name: "align",
      label: "Style",
      options: [
        { value: "left", label: "Orange rule on the left" },
        { value: "center", label: "Centred" },
      ],
    },
  ],

  Component: QuoteBlock,
  summary: (props) =>
    props.attribution ? `Quote · ${props.attribution}` : "Quote",
};
