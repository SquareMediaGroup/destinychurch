import { z } from "zod";
import type { BlockDefinition } from "../types";
import VideoBlock, { type VideoProps, youTubeId } from "./VideoBlock";

export const videoBlock: BlockDefinition<VideoProps> = {
  name: "video",
  version: 1,
  label: "Video",
  icon: "smart_display",
  category: "media",
  description: "A YouTube video, behind the cookie prompt.",
  width: "column",

  schema: z.object({
    url: z.string().default(""),
    caption: z.string().default(""),
  }),

  defaults: { url: "", caption: "" },

  fields: [
    {
      kind: "text",
      name: "url",
      label: "YouTube link",
      placeholder: "https://www.youtube.com/watch?v=…",
      help: "A watch, share, embed or Shorts link — or just the video ID.",
    },
    {
      kind: "text",
      name: "caption",
      label: "Caption",
      help: "Optional. Also used as the video's accessible title.",
    },
  ],

  Component: VideoBlock,
  summary: (props) => {
    const id = youTubeId(props.url);
    return id ? `Video · ${id}` : "Video · no link yet";
  },
};
