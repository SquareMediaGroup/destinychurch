// The first-visit popup. Goes through app/api/admin/popup.

import "server-only";
import { z } from "zod";
import { GET as popupGET, PUT as popupPUT } from "@/app/api/admin/popup/route";
import { windowState } from "@/lib/schedule";
import { AgentError, callRoute } from "../context.server";
import { describeWindow, formatLondon, resolveWindow } from "../time";
import { readTool, sameFields, writeTool, type ToolContext } from "../tool";

const PATH = "/api/admin/popup";

interface PopupRow {
  active: boolean;
  title: string | null;
  body: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  image_path: string | null;
  show_once: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

const COMPARED = ["active", "title", "body", "cta_text", "cta_link", "image_path", "starts_at", "ends_at"];

async function readPopup(ctx: ToolContext): Promise<PopupRow> {
  const row = await callRoute<PopupRow>(ctx.actor, PATH, popupGET);
  return {
    active: Boolean(row.active),
    title: row.title ?? null,
    body: row.body ?? null,
    cta_text: row.cta_text ?? null,
    cta_link: row.cta_link ?? null,
    image_url: row.image_url ?? null,
    image_path: row.image_path ?? null,
    show_once: row.show_once !== false,
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? null,
  };
}

function writePopup(ctx: ToolContext, row: PopupRow) {
  return callRoute(ctx.actor, PATH, popupPUT, {
    method: "PUT",
    body: { ...row, starts_at: row.starts_at ?? null, ends_at: row.ends_at ?? null },
  });
}

async function restorePopup(before: unknown, after: unknown, ctx: ToolContext) {
  const current = await readPopup(ctx);
  if (!sameFields(current as never, after as never, COMPARED)) {
    throw new AgentError("The popup has been changed since, so it wasn't undone. Check the Popup page.", 409);
  }
  const old = before as PopupRow;
  // A replaced image was deleted from storage by the popup route, so it can't
  // come back; restore everything else without it.
  const imageGone = old.image_path && old.image_path !== current.image_path;
  await writePopup(ctx, imageGone ? { ...old, image_url: null, image_path: null } : old);
}

export const getPopup = readTool({
  name: "get_popup",
  description:
    "Read the first-visit popup as it is now: title, text, button, image, and whether it is off, live, scheduled or ended.",
  schema: z.object({}),
  async run(_args, ctx) {
    const row = await readPopup(ctx);
    return {
      state: windowState(row, ctx.now),
      title: row.title,
      body: row.body,
      cta_text: row.cta_text,
      cta_link: row.cta_link,
      has_image: Boolean(row.image_url),
      show_once: row.show_once,
      shows: describeWindow(row.starts_at, row.ends_at),
    };
  },
});

export const setPopup = writeTool({
  name: "set_popup",
  description:
    "Propose showing the first-visit popup with new content (replaces the current popup). Can be scheduled. Does nothing until the admin confirms.",
  schema: z.object({
    title: z.string().min(2).max(80),
    body: z.string().min(2).max(400).describe("Plain text, one or two short sentences. No emojis."),
    cta_text: z.string().max(30).optional().describe("Button label, e.g. Book your place"),
    cta_link: z.string().max(300).optional().describe("Button link, / or https://"),
    show_once: z.boolean().optional().describe("Show once per visitor (default true)."),
    keep_image: z
      .boolean()
      .describe("Keep the image currently on the popup. False removes it (it is deleted and can't be undone)."),
    starts_at: z.string().optional().describe("ISO 8601 with the London offset. Omit for straight away."),
    ends_at: z.string().optional().describe("ISO 8601 with the London offset. Omit for no end."),
  }),
  async assess(args, ctx) {
    const times = resolveWindow(args.starts_at, args.ends_at, ctx.now, ctx.confirming);
    if (!times.ok) throw new AgentError(times.error);
    if (args.cta_link && !/^(\/|https:\/\/)/.test(args.cta_link)) {
      throw new AgentError("Links must start with / or https://.");
    }
    const current = await readPopup(ctx);
    const state = windowState(current, ctx.now);
    const warnings: string[] = [];
    let destructive = false;
    if (state === "live" || state === "scheduled") {
      destructive = true;
      warnings.push(
        state === "live"
          ? `Replaces the popup that is live now: “${current.title ?? "untitled"}”.`
          : `Replaces the popup scheduled for ${formatLondon(current.starts_at)}: “${current.title ?? "untitled"}”.`,
      );
    }
    if (!args.keep_image && current.image_path) {
      destructive = true;
      warnings.push("Deletes the current popup image. Undo can't bring the image back.");
    }
    return {
      risk: destructive ? "destructive" : "write",
      label: `Popup: “${args.title}”`,
      detail: `${describeWindow(times.starts, times.ends)}${args.cta_text ? `. Button: ${args.cta_text}` : ""}`,
      warnings,
      before: current,
    };
  },
  async execute(args, ctx) {
    const times = resolveWindow(args.starts_at, args.ends_at, ctx.now, true);
    if (!times.ok) throw new AgentError(times.error);
    const current = await readPopup(ctx);
    await writePopup(ctx, {
      active: true,
      title: args.title.trim(),
      body: args.body.trim(),
      cta_text: args.cta_text?.trim() || null,
      cta_link: args.cta_link?.trim() || null,
      image_url: args.keep_image ? current.image_url : null,
      image_path: args.keep_image ? current.image_path : null,
      show_once: args.show_once !== false,
      starts_at: times.starts,
      ends_at: times.ends,
    });
    return { after: await readPopup(ctx) };
  },
  async undo(step, ctx) {
    await restorePopup(step.before, step.after, ctx);
  },
});

export const clearPopup = writeTool({
  name: "clear_popup",
  description: "Propose switching the first-visit popup off now. Does nothing until the admin confirms.",
  schema: z.object({}),
  async assess(_args, ctx) {
    const current = await readPopup(ctx);
    const state = windowState(current, ctx.now);
    if (state === "off") throw new AgentError("The popup is already off.");
    return {
      risk: state === "live" ? "destructive" : "write",
      label: `Switch off the popup “${current.title ?? "untitled"}”`,
      detail: state === "live" ? "It is live now and stops showing straight away." : `It is ${state}; this switches it off.`,
      warnings: [],
      before: current,
    };
  },
  async execute(_args, ctx) {
    const current = await readPopup(ctx);
    await writePopup(ctx, { ...current, active: false });
    return { after: await readPopup(ctx) };
  },
  async undo(step, ctx) {
    await restorePopup(step.before, step.after, ctx);
  },
});
