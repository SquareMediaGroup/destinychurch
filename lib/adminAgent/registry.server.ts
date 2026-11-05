// Every tool DestinyAI has in Destiny Admin. Adding an area is adding its
// file under ./tools and listing it here; nothing else needs to know.

import "server-only";
import { clearBanner, getBanner, setBanner } from "./tools/banner.server";
import { clearPopup, getPopup, setPopup } from "./tools/popup.server";
import { featureEvent, findEvents, getFeaturedEvent, stopFeaturedEvent } from "./tools/featuredEvent.server";
import { binPost, createPost, findPosts, schedulePost, unpublishPost } from "./tools/posts.server";
import type { AgentTool, WriteTool } from "./tool";

export const AGENT_TOOLS: AgentTool[] = [
  getBanner,
  setBanner,
  clearBanner,
  getPopup,
  setPopup,
  clearPopup,
  findEvents,
  getFeaturedEvent,
  featureEvent,
  stopFeaturedEvent,
  findPosts,
  createPost,
  schedulePost,
  unpublishPost,
  binPost,
];

export function writeToolNamed(name: string): WriteTool | null {
  const tool = AGENT_TOOLS.find((t) => t.name === name);
  return tool?.kind === "write" ? tool : null;
}
