// The strip across the top of the site (and the sitewide maintenance block).
// Everything goes through app/api/admin/banner, which keeps the non-course
// banner Super Admin only.

import "server-only";
import { z } from "zod";
import { GET as bannerGET, PUT as bannerPUT } from "@/app/api/admin/banner/route";
import { isCourseEventType } from "@/lib/courseEvents";
import { windowState } from "@/lib/schedule";
import { AgentError, callRoute } from "../context.server";
import { describeWindow, formatLondon, resolveWindow } from "../time";
import { readTool, sameFields, writeTool, type ToolContext } from "../tool";

const PATH = "/api/admin/banner";

interface BannerRow {
  active: boolean;
  message: string;
  type: string;
  link: string | null;
  link_text: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  announcement: "Announcement (orange)",
  notice: "Notice (grey)",
  sitewide: "Site-wide block (replaces the whole site)",
};

const COMPARED = ["active", "message", "type", "link", "link_text", "starts_at", "ends_at"];

async function readBanner(ctx: ToolContext): Promise<BannerRow> {
  const row = await callRoute<BannerRow>(ctx.actor, PATH, bannerGET);
  return {
    active: Boolean(row.active),
    message: row.message ?? "",
    type: row.type ?? "announcement",
    link: row.link ?? null,
    link_text: row.link_text ?? null,
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? null,
  };
}

function describe(row: BannerRow, now: number) {
  const state = isCourseEventType(row.type) ? "off" : windowState(row, now);
  return {
    state,
    type: row.type,
    message: row.message,
    link: row.link,
    link_text: row.link_text,
    shows: describeWindow(row.starts_at, row.ends_at),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  };
}

function writeBanner(ctx: ToolContext, row: BannerRow) {
  return callRoute(ctx.actor, PATH, bannerPUT, {
    method: "PUT",
    body: {
      active: row.active,
      message: row.message,
      type: row.type,
      link: row.link ?? "",
      link_text: row.link_text ?? "",
      starts_at: row.starts_at ?? null,
      ends_at: row.ends_at ?? null,
    },
  });
}

/** Undo: put the old row back, unless someone has changed it since. */
async function restoreBanner(before: unknown, after: unknown, ctx: ToolContext) {
  const current = await readBanner(ctx);
  if (!sameFields(current as never, after as never, COMPARED)) {
    throw new AgentError("The banner has been changed since, so it wasn't undone. Check the Banner page.", 409);
  }
  const old = before as BannerRow | null;
  // No earlier main banner (only a course row came back): undo is "switch it off".
  if (!old || isCourseEventType(old.type)) {
    await writeBanner(ctx, { ...current, active: false });
    return;
  }
  await writeBanner(ctx, old);
}

export const getBanner = readTool({
  name: "get_banner",
  description:
    "Read the site banner as it is now: its type, message, link, and whether it is off, live, scheduled or ended. Call this before changing the banner.",
  schema: z.object({}),
  async run(_args, ctx) {
    return describe(await readBanner(ctx), ctx.now);
  },
});

const bannerSchema = z.object({
  type: z
    .enum(["announcement", "notice", "sitewide"])
    .describe(
      "announcement: orange bar for events and news. notice: grey bar for general information, the usual choice for a maintenance warning. sitewide: replaces the WHOLE site with a maintenance screen; only when they clearly want the site offline.",
    ),
  message: z.string().min(3).max(200).describe("The banner text. Short, friendly, British English, no emojis."),
  link: z.string().max(300).optional().describe("Optional link, e.g. /whats-on or https://..."),
  link_text: z.string().max(40).optional().describe("Optional link label, e.g. Find out more"),
  starts_at: z
    .string()
    .optional()
    .describe("When it appears. ISO 8601 with the London offset. Omit for straight away."),
  ends_at: z
    .string()
    .optional()
    .describe("When it disappears by itself. ISO 8601 with the London offset. Omit for no end."),
});

export const setBanner = writeTool({
  name: "set_banner",
  description:
    "Propose putting up the site banner (replaces whatever main banner there is). Can be scheduled to appear and disappear by itself. Does nothing until the admin confirms.",
  schema: bannerSchema,
  async assess(args, ctx) {
    const times = resolveWindow(args.starts_at, args.ends_at, ctx.now, ctx.confirming);
    if (!times.ok) throw new AgentError(times.error);
    const startAt = times.starts;
    const endAt = times.ends;
    if (args.link && !/^(\/|https:\/\/)/.test(args.link)) {
      throw new AgentError("Links must start with / or https://.");
    }

    const current = await readBanner(ctx);
    const state = isCourseEventType(current.type) ? "off" : windowState(current, ctx.now);
    const warnings: string[] = [];
    let destructive = false;

    if (args.type === "sitewide") {
      destructive = true;
      warnings.push("This blocks the entire website for every visitor, except /admin, while it is up.");
    }
    if (state === "live") {
      destructive = true;
      warnings.push(`Replaces the banner that is live now: “${current.message}”.`);
    } else if (state === "scheduled") {
      destructive = true;
      warnings.push(
        `Replaces the banner already scheduled for ${formatLondon(current.starts_at)}: “${current.message}”.`,
      );
    }

    return {
      risk: destructive ? "destructive" : "write",
      label: `Banner: “${args.message}”`,
      detail: `${TYPE_LABELS[args.type]}, ${describeWindow(startAt, endAt)}${
        args.link ? `. Links to ${args.link}` : ""
      }`,
      warnings,
      before: current,
    };
  },
  async execute(args, ctx) {
    const times = resolveWindow(args.starts_at, args.ends_at, ctx.now, true);
    if (!times.ok) throw new AgentError(times.error);
    await writeBanner(ctx, {
      active: true,
      message: args.message.trim(),
      type: args.type,
      link: args.link?.trim() || null,
      link_text: args.link_text?.trim() || null,
      starts_at: times.starts,
      ends_at: times.ends,
    });
    return { after: await readBanner(ctx) };
  },
  async undo(step, ctx) {
    await restoreBanner(step.before, step.after, ctx);
  },
});

export const clearBanner = writeTool({
  name: "clear_banner",
  description: "Propose taking the site banner down now. Does nothing until the admin confirms.",
  schema: z.object({}),
  async assess(_args, ctx) {
    const current = await readBanner(ctx);
    const state = isCourseEventType(current.type) ? "off" : windowState(current, ctx.now);
    if (state === "off") throw new AgentError("The banner is already off.");
    return {
      risk: state === "live" ? "destructive" : "write",
      label: `Take down the banner “${current.message}”`,
      detail: state === "live" ? "It is live now and disappears straight away." : `It is ${state}; this switches it off.`,
      warnings: [],
      before: current,
    };
  },
  async execute(_args, ctx) {
    const current = await readBanner(ctx);
    await writeBanner(ctx, { ...current, active: false });
    return { after: await readBanner(ctx) };
  },
  async undo(step, ctx) {
    await restoreBanner(step.before, step.after, ctx);
  },
});
