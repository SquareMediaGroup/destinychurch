import { z } from "zod";
import type { BlockDefinition } from "../types";
import { TONE_OPTIONS } from "../tokens";
import CardGridBlock, { type CardGridProps } from "./CardGridBlock";

export const cardGridBlock: BlockDefinition<CardGridProps> = {
  name: "card-grid",
  version: 1,
  label: "Card grid",
  icon: "grid_view",
  category: "layout",
  description: "Cards with an icon or number, title and text.",
  width: "wide",

  schema: z.object({
    eyebrow: z.string().default(""),
    heading: z.string().default(""),
    items: z
      .array(
        z.object({
          id: z.string().default(""),
          icon: z.string().default(""),
          title: z.string().default(""),
          body: z.string().default(""),
          href: z.string().default(""),
        }),
      )
      .default([]),
    columns: z.enum(["2", "3"]).default("2"),
    marker: z.enum(["icon", "number", "none"]).default("icon"),
    tone: z.enum(["light", "muted", "orange", "blue", "green", "purple"]).default("light"),
  }),

  defaults: {
    eyebrow: "",
    heading: "",
    items: [
      { id: "seed-1", icon: "schedule", title: "", body: "", href: "" },
      { id: "seed-2", icon: "location_on", title: "", body: "", href: "" },
    ],
    columns: "2",
    marker: "icon",
    tone: "light",
  },

  fields: [
    { kind: "text", name: "eyebrow", label: "Eyebrow" },
    { kind: "text", name: "heading", label: "Heading" },
    {
      kind: "repeater",
      name: "items",
      label: "Cards",
      addLabel: "Add card",
      itemDefaults: { icon: "", title: "", body: "", href: "" },
      itemLabel: (item, index) =>
        typeof item.title === "string" && item.title.trim()
          ? item.title
          : `Card ${index + 1}`,
      itemFields: [
        { kind: "text", name: "title", label: "Title" },
        { kind: "textarea", name: "body", label: "Text", rows: 3 },
        { kind: "icon", name: "icon", label: "Icon" },
        {
          kind: "url",
          name: "href",
          label: "Links to",
          help: "Optional. Makes the whole card clickable.",
        },
      ],
    },
    {
      kind: "select",
      name: "marker",
      label: "Show",
      options: [
        { value: "icon", label: "Icons" },
        { value: "number", label: "Numbers" },
        { value: "none", label: "Nothing" },
      ],
    },
    {
      kind: "select",
      name: "columns",
      label: "Columns",
      options: [
        { value: "2", label: "Two" },
        { value: "3", label: "Three" },
      ],
    },
    { kind: "tone", name: "tone", label: "Card colour", options: TONE_OPTIONS },
  ],

  Component: CardGridBlock,
  summary: (props) =>
    `Cards · ${props.items.length} card${props.items.length === 1 ? "" : "s"}`,
};
