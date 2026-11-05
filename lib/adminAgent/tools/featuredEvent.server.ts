// The featured event: one ChurchSuite event promoted on the homepage and
// /whats-on. Goes through app/api/admin/events (the picker feed) and
// app/api/admin/featured-event. The popup columns on the same row belong to
// the Event Popup page and are never written here.

import "server-only";
import { z } from "zod";
import { GET as eventsGET } from "@/app/api/admin/events/route";
import { GET as featuredGET, PUT as featuredPUT } from "@/app/api/admin/featured-event/route";
import { windowState } from "@/lib/schedule";
import { AgentError, callRoute } from "../context.server";
import { describeWindow, formatLondon, resolveWindow } from "../time";
import { readTool, sameFields, writeTool, type ToolContext } from "../tool";

const PATH = "/api/admin/featured-event";

interface PickerEvent {
  slug: string;
  identifier: string | null;
  sequence: number | null;
  id: number;
  name: string;
  start: string;
  end: string;
  endsAt: string;
  category: string | null;
  location: string | null;
  sessionCount: number;
}

type FeaturedRow = Record<string, unknown> & {
  event_identifier: string | null;
  event_name: string | null;
  event_slug: string | null;
  event_ends_at: string | null;
  active: boolean;
  promote_from: string | null;
  promote_until: string | null;
  image_path: string | null;
  popup_active?: boolean;
};

/** The columns featured-event PUT accepts (no popup_*). */
const HERO_FIELDS = [
  "event_identifier",
  "event_sequence",
  "event_id",
  "event_name",
  "event_slug",
  "event_ends_at",
  "active",
  "promote_from",
  "promote_until",
  "headline",
  "blurb",
  "image_url",
  "image_path",
  "cta_text",
  "cta_link",
];

function heroFields(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(HERO_FIELDS.map((f) => [f, row[f] ?? null]));
}

async function readFeatured(ctx: ToolContext): Promise<FeaturedRow> {
  return callRoute<FeaturedRow>(ctx.actor, PATH, featuredGET);
}

async function readEvents(ctx: ToolContext): Promise<PickerEvent[]> {
  const { events } = await callRoute<{ events: PickerEvent[] }>(ctx.actor, "/api/admin/events", eventsGET);
  return events;
}

function stateOf(row: FeaturedRow, now: number) {
  if (!row.event_identifier) return "off" as const;
  if (row.event_ends_at && Date.parse(row.event_ends_at) <= now) return "ended" as const;
  return windowState({ active: row.active, starts_at: row.promote_from, ends_at: row.promote_until }, now);
}

function writeFeatured(ctx: ToolContext, row: Record<string, unknown>) {
  return callRoute(ctx.actor, PATH, featuredPUT, { method: "PUT", body: heroFields(row) });
}

async function restoreFeatured(before: unknown, after: unknown, ctx: ToolContext) {
  const current = await readFeatured(ctx);
  if (!sameFields(current, after as never, HERO_FIELDS)) {
    throw new AgentError(
      "The featured event has been changed since, so it wasn't undone. Check the Featured Event page.",
      409,
    );
  }
  const old = before as FeaturedRow;
  // Replaced artwork is deleted from storage by the route; it can't return.
  const imageGone = old.image_path && old.image_path !== current.image_path;
  await writeFeatured(ctx, imageGone ? { ...old, image_url: null, image_path: null } : old);
}

export const findEvents = readTool({
  name: "find_events",
  description:
    "Search upcoming ChurchSuite events that can be featured. Returns slug, name, first date and how many sessions.",
  schema: z.object({
    query: z.string().max(80).optional().describe("Words from the event name. Omit to list the next events."),
  }),
  async run(args, ctx) {
    const events = await readEvents(ctx);
    const words = (args.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    return events
      .filter((e) => words.every((w) => `${e.name} ${e.category ?? ""}`.toLowerCase().includes(w)))
      .slice(0, 15)
      .map((e) => ({
        slug: e.slug,
        name: e.name,
        first_session: formatLondon(e.start),
        sessions: e.sessionCount,
        last_session_ends: formatLondon(e.endsAt),
        location: e.location,
      }));
  },
});

export const getFeaturedEvent = readTool({
  name: "get_featured_event",
  description: "Read which event is featured now, its promotion window, and whether it is live.",
  schema: z.object({}),
  async run(_args, ctx) {
    const row = await readFeatured(ctx);
    return {
      state: stateOf(row, ctx.now),
      event: row.event_name,
      event_slug: row.event_slug,
      promoted: describeWindow(row.promote_from, row.promote_until),
      headline: row.headline ?? null,
      blurb: row.blurb ?? null,
      event_popup_on: Boolean(row.popup_active),
    };
  },
});

export const featureEvent = writeTool({
  name: "feature_event",
  description:
    "Propose featuring a ChurchSuite event on the homepage and What's On, optionally for a window. Use find_events first for the slug. Does nothing until the admin confirms.",
  schema: z.object({
    event_slug: z.string().min(1),
    promote_from: z.string().optional().describe("ISO 8601 with the London offset. Omit for straight away."),
    promote_until: z
      .string()
      .optional()
      .describe("ISO 8601 with the London offset. Omit to run until the event's last session."),
    headline: z.string().max(80).optional().describe("Override the hero headline. Omit to use the event name."),
    blurb: z.string().max(300).optional().describe("Override the hero text. Omit to use ChurchSuite's."),
  }),
  async assess(args, ctx) {
    const times = resolveWindow(args.promote_from, args.promote_until, ctx.now, ctx.confirming);
    if (!times.ok) throw new AgentError(times.error);
    const event = (await readEvents(ctx)).find((e) => e.slug === args.event_slug);
    if (!event) throw new AgentError(`There's no upcoming event "${args.event_slug}". Use find_events.`);

    const current = await readFeatured(ctx);
    const state = stateOf(current, ctx.now);
    const sameEvent = current.event_identifier === event.identifier;
    const warnings: string[] = [];
    let destructive = false;
    if (!sameEvent && (state === "live" || state === "scheduled")) {
      destructive = true;
      warnings.push(`Replaces “${current.event_name}”, which is ${state === "live" ? "featured now" : "scheduled"}.`);
    }
    if (!sameEvent && current.image_path) {
      destructive = true;
      warnings.push(`Deletes the custom artwork uploaded for “${current.event_name}”. Undo can't bring it back.`);
    }
    if (!sameEvent && current.popup_active) {
      warnings.push("The event popup is on, so it will advertise this event instead.");
    }
    return {
      risk: destructive ? "destructive" : "write",
      label: `Feature “${event.name}”`,
      detail: `On the homepage and What's On ${describeWindow(times.starts, times.ends ?? event.endsAt)}`,
      warnings,
      before: current,
    };
  },
  async execute(args, ctx) {
    const times = resolveWindow(args.promote_from, args.promote_until, ctx.now, true);
    if (!times.ok) throw new AgentError(times.error);
    const event = (await readEvents(ctx)).find((e) => e.slug === args.event_slug);
    if (!event) throw new AgentError(`The event "${args.event_slug}" is no longer in ChurchSuite.`);
    const current = await readFeatured(ctx);
    const sameEvent = current.event_identifier === event.identifier;
    // Switching event drops the old event's copy and artwork, which belong to
    // it; the hero then falls back to ChurchSuite's.
    const base = sameEvent ? current : { ...current, headline: null, blurb: null, image_url: null, image_path: null, cta_text: null, cta_link: null };
    await writeFeatured(ctx, {
      ...base,
      event_identifier: event.identifier,
      event_sequence: event.sequence,
      event_id: event.id,
      event_name: event.name,
      event_slug: event.slug,
      event_ends_at: event.endsAt,
      active: true,
      promote_from: times.starts,
      promote_until: times.ends,
      ...(args.headline ? { headline: args.headline.trim() } : {}),
      ...(args.blurb ? { blurb: args.blurb.trim() } : {}),
    });
    return { after: await readFeatured(ctx) };
  },
  async undo(step, ctx) {
    await restoreFeatured(step.before, step.after, ctx);
  },
});

export const stopFeaturedEvent = writeTool({
  name: "stop_featured_event",
  description: "Propose stopping the featured event promotion now. Does nothing until the admin confirms.",
  schema: z.object({}),
  async assess(_args, ctx) {
    const current = await readFeatured(ctx);
    const state = stateOf(current, ctx.now);
    if (state === "off") throw new AgentError("No event is being featured.");
    if (current.popup_active) {
      throw new AgentError(
        "The event popup is on and advertises the featured event. It has to be turned off on the Event Popup page first.",
      );
    }
    return {
      risk: state === "live" ? "destructive" : "write",
      label: `Stop featuring “${current.event_name}”`,
      detail: state === "live" ? "It comes off the homepage and What's On straight away." : `It is ${state}; this switches it off.`,
      warnings: [],
      before: current,
    };
  },
  async execute(_args, ctx) {
    const current = await readFeatured(ctx);
    await writeFeatured(ctx, { ...current, active: false });
    return { after: await readFeatured(ctx) };
  },
  async undo(step, ctx) {
    await restoreFeatured(step.before, step.after, ctx);
  },
});
