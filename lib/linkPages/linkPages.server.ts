// Reading a links page for the public site: the page row, its live blocks, and
// event blocks resolved against the ChurchSuite feed.
//
// Same shape as lib/nfcTiles.server.ts, for the same reasons: server-only so
// the service client can't leak into a bundle, noStore so schedules and event
// expiry are judged on the clock of this request rather than a cached one,
// and a hardcoded fallback so /links never renders blank — if Supabase is
// down, or the migration hasn't run, the six Next Steps it has always shown
// are still there.

import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { eventImage, formatKicker, type EventIndex, type EventSeries } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { getEventIndex } from "@/lib/events.server";
import { findSeries, framableSignupUrl } from "@/lib/eventTargets.server";
import { LINKS_STEPS } from "@/lib/linksSteps";
import { DEFAULT_THEME, parseTheme } from "./theme";
import {
  LinkBlockSchema,
  LinkDataSchema,
  LinkPageSchema,
  MAIN_SLUG,
  type EventCard,
  type LinkBlock,
  type LinkPageWithId,
  type ResolvedBlock,
  type ResolvedLinkPage,
} from "./types";

export const LINK_PAGE_COLUMNS =
  "id, slug, title, bio, avatar_url, theme, socials, socials_position, seo_title, seo_description, og_image_url, noindex, published";
export const LINK_BLOCK_COLUMNS = "id, type, data, active, starts_at, ends_at, sort_order";

/** A stored page row → the validated page. Unknown junk is defaulted, not fatal. */
export function toPage(row: Record<string, unknown>): LinkPageWithId {
  const parsed = LinkPageSchema.safeParse({
    ...row,
    avatar_url: row.avatar_url ?? "",
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    og_image_url: row.og_image_url ?? "",
    theme: parseTheme(row.theme),
  });
  const page = parsed.success
    ? parsed.data
    : LinkPageSchema.parse({ slug: String(row.slug ?? MAIN_SLUG), theme: {} });
  return { ...page, id: String(row.id) };
}

/** A stored block row → a validated block, or null if it no longer parses. */
export function toBlock(row: Record<string, unknown>): LinkBlock | null {
  const parsed = LinkBlockSchema.safeParse({
    id: row.id,
    type: row.type,
    data: row.data ?? {},
    active: row.active,
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? null,
  });
  return parsed.success ? parsed.data : null;
}

export function toEventCard(series: EventSeries): EventCard {
  return {
    key: series.seriesKey,
    name: series.name,
    kicker: formatKicker(series.primary),
    image: eventImage(series.primary) ?? null,
    location: series.primary.location?.name ?? null,
    signupUrl: framableSignupUrl(series),
    href: `/whats-on/${series.slug}`,
  };
}

/** Is a block live right now, by its own schedule? */
export function isScheduledNow(block: Pick<LinkBlock, "starts_at" | "ends_at">, now: number): boolean {
  if (block.starts_at && Date.parse(block.starts_at) > now) return false;
  if (block.ends_at && Date.parse(block.ends_at) <= now) return false;
  return true;
}

/**
 * Attach event cards to event blocks. A pinned single event that has finished
 * is dropped; one that has merely left the feed (or the feed is down) is also
 * dropped, because unlike an NFC tile there is no stored signup to fall back to
 * and an event card that goes nowhere is worse than no card.
 */
export function resolveEventBlocks(
  blocks: LinkBlock[],
  index: EventIndex | null,
  now: number,
): ResolvedBlock[] {
  const out: ResolvedBlock[] = [];
  for (const block of blocks) {
    if (block.type !== "event") {
      out.push(block);
      continue;
    }
    if (!index) continue;
    const d = block.data;

    if (d.mode === "single") {
      if (d.event_ends_at && Date.parse(d.event_ends_at) <= now) continue;
      const series = findSeries(index, d.event_identifier, d.event_sequence);
      if (!series) continue;
      out.push({ ...block, events: [toEventCard(series)] });
      continue;
    }

    const category = d.category.trim().toLowerCase();
    const series = index.series
      .filter((s) => !category || (s.primary.category?.name ?? "").toLowerCase() === category)
      .slice(0, d.count);
    if (series.length === 0) continue;
    out.push({ ...block, events: series.map(toEventCard) });
  }
  return out;
}

/** Everything a published page needs to render, or null if there's no such page. */
export async function getLinkPage(slug: string): Promise<ResolvedLinkPage | null> {
  noStore();
  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from("link_pages")
    .select(LINK_PAGE_COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;

  const page = toPage(row as Record<string, unknown>);

  const { data: rows } = await supabase
    .from("link_blocks")
    .select(LINK_BLOCK_COLUMNS)
    .eq("page_id", page.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const now = Date.now();
  const blocks = ((rows ?? []) as Record<string, unknown>[])
    .map(toBlock)
    .filter((b): b is LinkBlock => b !== null && isScheduledNow(b, now));

  // Only pay for the feed when a block actually shows events.
  const index = blocks.some((b) => b.type === "event") ? await getEventIndex() : null;

  return { page, theme: page.theme, blocks: resolveEventBlocks(blocks, index, now) };
}

/**
 * /links when the database can't answer: today's six Next Steps as plain link
 * buttons in the default theme. Block ids are the hrefs, which /api/track
 * still accepts for exactly this case.
 */
export function fallbackMainPage(): ResolvedLinkPage {
  const page: LinkPageWithId = {
    ...LinkPageSchema.parse({
      slug: MAIN_SLUG,
      title: "Destiny Church Tees Valley",
      bio: "Take your next step with us.",
      theme: {},
      seo_title: "Next Steps",
    }),
    id: "fallback",
  };
  return {
    page,
    theme: DEFAULT_THEME,
    blocks: LINKS_STEPS.map((step) => ({
      id: step.href,
      type: "link" as const,
      active: true,
      starts_at: null,
      ends_at: null,
      // Through the schema, so every newer field gets its default.
      data: LinkDataSchema.parse({
        title: step.title,
        subtitle: step.blurb,
        url: step.href,
        icon: step.icon,
      }),
    })),
  };
}

/** Published, indexable pages other than main — for the sitemap. */
export async function listIndexableLinkPages(): Promise<{ slug: string; updated_at: string }[]> {
  const { data } = await createServiceClient()
    .from("link_pages")
    .select("slug, updated_at")
    .eq("published", true)
    .eq("noindex", false)
    .neq("slug", MAIN_SLUG);
  return (data ?? []) as { slug: string; updated_at: string }[];
}
