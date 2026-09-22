// Validating a links page save — everything app/api/admin/links/[id] checks
// before it hands the page to link_page_save().
//
// The editor validates as you type, but the browser is never trusted: every
// block is re-parsed here, and a pinned event is looked up in the live feed
// again so the stored name and expiry come from ChurchSuite, not the request.

import "server-only";
import type { ZodError } from "zod";
import { resolveEventTarget } from "@/lib/eventTargets.server";
import {
  BLOCK_META,
  LinkBlockSchema,
  LinkPageSchema,
  MAIN_SLUG,
  blockLabel,
  type LinkBlock,
  type LinkBlockType,
  type LinkPage,
} from "./types";

export const MAX_BLOCKS = 80;

/** The first problem, as a sentence an admin can act on. */
export function firstIssue(error: ZodError, prefix = ""): string {
  const issue = error.issues[0];
  if (!issue) return `${prefix}Something isn't valid`;
  return `${prefix}${issue.message}`;
}

function describe(raw: unknown, index: number): string {
  const r = (raw ?? {}) as { type?: string; data?: Record<string, unknown> };
  const type = (r.type ?? "") as LinkBlockType;
  const noun = BLOCK_META[type]?.label ?? "Block";
  const label = r.data ? blockLabel({ type: r.type ?? "", data: r.data }) : "";
  return `Block ${index + 1} (${noun}${label && label !== noun ? ` “${label}”` : ""}): `;
}

export async function validateSave(
  input: { page?: unknown; blocks?: unknown },
  current: { slug: string },
): Promise<{ page: LinkPage; blocks: LinkBlock[] } | { error: string }> {
  const parsedPage = LinkPageSchema.safeParse(input.page);
  if (!parsedPage.success) return { error: firstIssue(parsedPage.error) };
  const page = parsedPage.data;

  // The main page is /links itself: it can't move, and it can't go dark.
  if (current.slug === MAIN_SLUG) {
    if (page.slug !== MAIN_SLUG) return { error: "The main page's address is always /links." };
    if (!page.published) return { error: "The main /links page can't be unpublished." };
  } else if (page.slug === MAIN_SLUG) {
    return { error: "“main” is reserved for /links itself — pick another address." };
  }

  if (!Array.isArray(input.blocks)) return { error: "Missing blocks" };
  if (input.blocks.length > MAX_BLOCKS)
    return { error: `A page can have at most ${MAX_BLOCKS} blocks.` };

  const blocks: LinkBlock[] = [];
  const seen = new Set<string>();

  for (const [index, raw] of input.blocks.entries()) {
    const parsed = LinkBlockSchema.safeParse(raw);
    if (!parsed.success) return { error: firstIssue(parsed.error, describe(raw, index)) };
    const block = parsed.data;

    if (seen.has(block.id)) return { error: `${describe(raw, index)}duplicate block id` };
    seen.add(block.id);

    if (block.type === "event") {
      const d = block.data;
      if (d.mode === "single") {
        if (!d.event_identifier)
          return { error: `${describe(raw, index)}pick an event, or switch to “Upcoming events”.` };
        const resolved = await resolveEventTarget(d.event_identifier, d.event_sequence, {
          requireSignup: false,
        });
        if ("error" in resolved) return { error: `${describe(raw, index)}${resolved.error}` };
        block.data = {
          ...d,
          event_name: resolved.name,
          event_sequence: resolved.sequence,
          event_ends_at: resolved.endsAt,
        };
      } else {
        // An upcoming-events list points at nothing in particular.
        block.data = { ...d, event_identifier: "", event_sequence: null, event_name: "", event_ends_at: "" };
      }
    }

    blocks.push(block);
  }

  return { page, blocks };
}
