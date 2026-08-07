import { z } from "zod";
import type { BlockDefinition } from "../types";
import EmbedBlock, { type EmbedProps } from "./EmbedBlock";

export const embedBlock: BlockDefinition<EmbedProps> = {
  name: "embed",
  version: 1,
  label: "Custom embed",
  icon: "code",
  category: "advanced",
  description: "Paste raw HTML. Use only when nothing else fits.",
  width: "column",

  schema: z.object({
    html: z.string().default(""),
  }),

  defaults: { html: "" },

  fields: [
    {
      kind: "textarea",
      name: "html",
      label: "Embed code",
      rows: 8,
      placeholder: '<iframe src="…"></iframe>',
      help: "Rendered exactly as written. For YouTube or ChurchSuite use those blocks instead — they show visitors the cookie prompt first.",
    },
  ],

  Component: EmbedBlock,
  summary: () => "Custom embed",
};
