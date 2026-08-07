import { z } from "zod";
import type { BlockDefinition } from "../types";
import GalleryBlock, { type GalleryProps } from "./GalleryBlock";

export const galleryBlock: BlockDefinition<GalleryProps> = {
  name: "gallery",
  version: 1,
  label: "Image gallery",
  icon: "photo_library",
  category: "media",
  description: "A grid of photos with an optional caption.",
  width: "wide",

  schema: z.object({
    items: z
      .array(
        z.object({
          id: z.string().default(""),
          src: z.string().default(""),
          alt: z.string().default(""),
        }),
      )
      .default([]),
    columns: z.enum(["2", "3"]).default("2"),
    crop: z.enum(["square", "landscape", "natural"]).default("square"),
    caption: z.string().default(""),
  }),

  defaults: { items: [], columns: "2", crop: "square", caption: "" },

  fields: [
    {
      kind: "repeater",
      name: "items",
      label: "Images",
      addLabel: "Add image",
      max: 12,
      itemDefaults: { src: "", alt: "" },
      itemLabel: (item, index) =>
        typeof item.alt === "string" && item.alt.trim()
          ? item.alt
          : `Image ${index + 1}`,
      itemFields: [
        { kind: "image", name: "src", label: "Image" },
        {
          kind: "text",
          name: "alt",
          label: "Description",
          help: "Describes the photo for screen readers. Leave blank if it's purely decorative.",
        },
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
    {
      kind: "select",
      name: "crop",
      label: "Shape",
      options: [
        { value: "square", label: "Square" },
        { value: "landscape", label: "Landscape" },
        { value: "natural", label: "Original shape" },
      ],
    },
    { kind: "text", name: "caption", label: "Caption", help: "Optional." },
  ],

  Component: GalleryBlock,
  summary: (props) =>
    `Gallery · ${props.items.length} image${props.items.length === 1 ? "" : "s"}`,
};
