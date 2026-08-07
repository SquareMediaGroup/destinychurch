import { z } from "zod";
import type { BlockDefinition } from "../types";
import ButtonsBlock, { type ButtonsProps } from "./ButtonsBlock";

export const buttonsBlock: BlockDefinition<ButtonsProps> = {
  name: "buttons",
  version: 1,
  label: "Buttons",
  icon: "smart_button",
  category: "action",
  description: "A row of call-to-action links.",
  width: "column",

  schema: z.object({
    items: z
      .array(
        z.object({
          id: z.string().default(""),
          label: z.string().default(""),
          href: z.string().default(""),
          style: z.enum(["primary", "secondary", "text"]).default("primary"),
          icon: z.string().default(""),
        }),
      )
      .default([]),
    align: z.enum(["left", "center"]).default("left"),
  }),

  defaults: {
    items: [{ id: "seed-1", label: "Find out more", href: "", style: "primary", icon: "" }],
    align: "left",
  },

  fields: [
    {
      kind: "repeater",
      name: "items",
      label: "Buttons",
      addLabel: "Add button",
      max: 3,
      itemDefaults: { label: "", href: "", style: "primary", icon: "" },
      itemLabel: (item, index) =>
        typeof item.label === "string" && item.label.trim()
          ? item.label
          : `Button ${index + 1}`,
      itemFields: [
        { kind: "text", name: "label", label: "Label" },
        { kind: "url", name: "href", label: "Links to" },
        {
          kind: "select",
          name: "style",
          label: "Style",
          options: [
            { value: "primary", label: "Solid orange" },
            { value: "secondary", label: "Outlined" },
            { value: "text", label: "Text link" },
          ],
        },
        { kind: "icon", name: "icon", label: "Icon", help: "Optional." },
      ],
    },
    {
      kind: "select",
      name: "align",
      label: "Alignment",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Centred" },
      ],
    },
  ],

  Component: ButtonsBlock,
  summary: (props) =>
    `Buttons · ${props.items.length} link${props.items.length === 1 ? "" : "s"}`,
};
