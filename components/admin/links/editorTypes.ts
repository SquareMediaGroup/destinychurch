// Editor-side shapes and helpers for the links page editor.
//
// The editor holds blocks loosely typed (`data` is whatever the form has so
// far — a new link has no URL yet), and turns them into the renderer's strict
// ResolvedBlock[] for the live preview here, the same way the server does for
// the real page: parse, drop what doesn't parse, attach event cards.

import { formatKicker } from "@destiny/shared";
import type { PickerEvent } from "@/components/admin/EventPicker";
import { SIGNUP_ANCHOR } from "@/lib/nfcTiles";
import {
  LinkBlockSchema,
  type EventCard,
  type LinkBlockType,
  type LinkPageWithId,
  type ResolvedBlock,
} from "@/lib/linkPages/types";

export interface EditorBlock {
  id: string;
  type: LinkBlockType;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  data: Record<string, unknown>;
}

export type EditorPage = LinkPageWithId;

export function newBlockId(): string {
  return crypto.randomUUID();
}

/** Why a block won't save, or null. Mirrors the server's parse. */
export function blockProblem(block: EditorBlock): string | null {
  const parsed = LinkBlockSchema.safeParse(block);
  if (parsed.success) {
    if (block.type === "event" && block.data.mode === "single" && !block.data.event_identifier) {
      return "Pick an event";
    }
    return null;
  }
  return parsed.error.issues[0]?.message ?? "Incomplete";
}

export function pickerToCard(ev: PickerEvent): EventCard {
  const signup =
    ev.signupUrl && ev.signupEmbeddable
      ? ev.signupUrl.includes("#")
        ? ev.signupUrl
        : `${ev.signupUrl}${SIGNUP_ANCHOR}`
      : null;
  return {
    key: String(ev.sequence ?? ev.identifier ?? ev.slug),
    name: ev.name,
    kicker: formatKicker({ datetime_start: ev.start, datetime_end: ev.end }),
    image: ev.image,
    location: ev.location,
    signupUrl: signup,
    href: `/whats-on/${ev.slug}`,
  };
}

/**
 * The preview's blocks: what the page would show right now. Inactive and
 * out-of-schedule blocks are left out, exactly as the live page leaves them out.
 */
export function previewBlocks(
  blocks: EditorBlock[],
  events: PickerEvent[] | null,
  now: number,
): ResolvedBlock[] {
  const out: ResolvedBlock[] = [];
  for (const raw of blocks) {
    if (!raw.active) continue;
    const parsed = LinkBlockSchema.safeParse(raw);
    if (!parsed.success) continue;
    const block = parsed.data;
    if (block.starts_at && Date.parse(block.starts_at) > now) continue;
    if (block.ends_at && Date.parse(block.ends_at) <= now) continue;

    if (block.type !== "event") {
      out.push(block);
      continue;
    }
    if (!events) continue;
    const d = block.data;
    if (d.mode === "single") {
      const ev =
        events.find((e) => e.identifier && e.identifier === d.event_identifier) ??
        (d.event_sequence != null ? events.find((e) => e.sequence === d.event_sequence) : undefined);
      if (ev) out.push({ ...block, events: [pickerToCard(ev)] });
      continue;
    }
    const category = d.category.trim().toLowerCase();
    const list = events
      .filter((e) => !category || (e.category ?? "").toLowerCase() === category)
      .slice(0, d.count)
      .map(pickerToCard);
    if (list.length) out.push({ ...block, events: list });
  }
  return out;
}

export function pagePath(slug: string): string {
  return slug === "main" ? "/links" : `/links/${slug}`;
}

/**
 * Where the page is actually served — the origin this admin is running on.
 * Not destinytees.uk: that domain still points at the old site, so a QR code
 * printed with it would open the wrong page.
 */
export function liveUrl(slug: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${pagePath(slug)}`;
}
