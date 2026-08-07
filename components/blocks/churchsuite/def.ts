import { z } from "zod";
import type { BlockDefinition } from "../types";
import ChurchSuiteBlock, {
  churchSuiteEmbedUrl,
  type ChurchSuiteProps,
} from "./ChurchSuiteBlock";

export const churchSuiteBlock: BlockDefinition<ChurchSuiteProps> = {
  name: "churchsuite-form",
  version: 1,
  label: "ChurchSuite form",
  icon: "assignment",
  category: "action",
  description: "Embed a ChurchSuite signup form.",
  width: "column",

  schema: z.object({
    form: z.string().default(""),
    title: z.string().default(""),
    height: z.number().default(600),
  }),

  defaults: { form: "", title: "", height: 600 },

  fields: [
    {
      kind: "text",
      name: "form",
      label: "Form link or code",
      placeholder: "kw3c1oly",
      help: "Paste the full ChurchSuite form URL, or just the code from the end of it.",
    },
    {
      kind: "text",
      name: "title",
      label: "Accessible title",
      help: "Describes the form to screen readers, e.g. \"Alpha signup\".",
    },
    {
      kind: "number",
      name: "height",
      label: "Height (px)",
      min: 200,
      max: 2000,
      step: 50,
      help: "ChurchSuite forms can't resize themselves, so this is set by hand.",
    },
  ],

  Component: ChurchSuiteBlock,
  summary: (props) =>
    churchSuiteEmbedUrl(props.form) ? "ChurchSuite form" : "ChurchSuite form · not set",
};
