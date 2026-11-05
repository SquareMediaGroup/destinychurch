// Posts (pages at /<slug>). Goes through app/api/admin/posts and
// app/api/admin/posts/[id], so revisions, slug rules, redirects and the audit
// entry all come from the same code the editor uses.
//
// DestinyAI never writes HTML. It sends plain-text sections and buildBody()
// escapes them, so nothing the model produces (or anything it read, such as a
// post title) can end up as markup on a public page.

import "server-only";
import { z } from "zod";
import { GET as postsGET, POST as postsPOST } from "@/app/api/admin/posts/route";
import {
  DELETE as postDELETE,
  GET as postGET,
  PATCH as postPATCH,
} from "@/app/api/admin/posts/[id]/route";
import { postState, type Post } from "@/lib/posts";
import { checkSlug } from "@/lib/posts-slug";
import { createServiceClient } from "@/utils/supabase/service";
import { AgentError, callRoute, requireAccess } from "../context.server";
import { describeWindow, formatLondon, resolveWindow } from "../time";
import { buildBody } from "../postBody";
import { readTool, sameFields, writeTool, type ToolContext } from "../tool";

const LIST = "/api/admin/posts";
const one = (id: string) => `/api/admin/posts/${id}`;

const SCHEDULE_FIELDS = ["is_published", "publish_from", "publish_until", "deleted_at"];

async function readPost(ctx: ToolContext, id: string): Promise<Post> {
  return callRoute<Post>(ctx.actor, one(id), postGET, { params: { id } });
}

function summary(post: Post, now: number) {
  return {
    id: post.id,
    title: post.title,
    url: `/${post.slug}`,
    state: post.deleted_at ? "in the bin" : postState(post, now),
    shows: post.is_published ? describeWindow(post.publish_from, post.publish_until) : "not published",
    has_unpublished_changes: Boolean(post.draft),
  };
}

function isLive(post: Post, now: number) {
  return !post.deleted_at && postState(post, now) === "live";
}

/** Undo for schedule / unpublish: put the publishing fields back. */
async function restoreSchedule(before: unknown, after: unknown, ctx: ToolContext, id: string) {
  const current = await readPost(ctx, id);
  if (!sameFields(current as never, after as never, SCHEDULE_FIELDS)) {
    throw new AgentError("The post has been changed since, so it wasn't undone. Check it in Posts.", 409);
  }
  const old = before as Post;
  await callRoute(ctx.actor, one(id), postPATCH, {
    method: "PATCH",
    params: { id },
    body: {
      is_published: old.is_published,
      publish_from: old.publish_from,
      publish_until: old.publish_until,
    },
  });
}

export const findPosts = readTool({
  name: "find_posts",
  description:
    "Search posts (pages at /slug) by words in the title or URL. Returns id, title, URL and whether each is draft, scheduled, live, ended or in the bin.",
  schema: z.object({
    query: z.string().max(80).optional().describe("Words from the title or URL. Omit for the most recent."),
  }),
  async run(args, ctx) {
    const posts = await callRoute<Post[]>(ctx.actor, LIST, postsGET);
    const words = (args.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    return posts
      .filter((p) => words.every((w) => `${p.title} ${p.slug}`.toLowerCase().includes(w)))
      .slice(0, 15)
      .map((p) => summary(p, ctx.now));
  },
});

const sectionSchema = z.object({
  heading: z.string().max(120).optional(),
  paragraphs: z.array(z.string().max(2000)).min(1).max(12),
});

export const createPost = writeTool({
  name: "create_post",
  description:
    "Propose a new post (a page at /slug) with plain-text sections. publish: draft (not on the site), now, or scheduled (needs publish_from). Does nothing until the admin confirms.",
  schema: z.object({
    title: z.string().min(2).max(120),
    slug: z.string().max(80).optional().describe("URL part, e.g. christmas-services. Omit to make one from the title."),
    subtitle: z.string().max(160).optional(),
    description: z.string().max(160).optional().describe("Search engine / sharing description."),
    sections: z.array(sectionSchema).min(1).max(10),
    publish: z.enum(["draft", "now", "scheduled"]),
    publish_from: z.string().optional().describe("ISO 8601 with the London offset. Needed for scheduled."),
    publish_until: z.string().optional().describe("ISO 8601 with the London offset. Takes the page down then."),
  }),
  async assess(args, ctx) {
    requireAccess(ctx.actor, LIST);
    if (args.publish === "scheduled" && !args.publish_from) {
      throw new AgentError("A scheduled post needs publish_from.");
    }
    const times = resolveWindow(
      args.publish === "scheduled" ? args.publish_from : undefined,
      args.publish_until,
      ctx.now,
      ctx.confirming,
    );
    if (!times.ok) throw new AgentError(times.error);
    const slug = await checkSlug(createServiceClient(), args.slug || args.title);
    if (!slug.ok) throw new AgentError(slug.reason);
    return {
      risk: "write",
      label: `New post “${args.title}” at /${slug.slug}`,
      detail:
        args.publish === "draft"
          ? "Saved as a draft. Nothing appears on the site."
          : `Published ${describeWindow(times.starts, times.ends)}`,
      warnings: [],
      before: null,
    };
  },
  async execute(args, ctx) {
    const times = resolveWindow(
      args.publish === "scheduled" ? args.publish_from : undefined,
      args.publish_until,
      ctx.now,
      true,
    );
    if (!times.ok) throw new AgentError(times.error);
    const created = await callRoute<Post>(ctx.actor, LIST, postsPOST, {
      method: "POST",
      body: {
        title: args.title.trim(),
        slug: args.slug || args.title,
        subtitle: args.subtitle,
        description: args.description,
        body: buildBody(args.sections),
        is_published: args.publish !== "draft",
        publish_from: times.starts,
        publish_until: times.ends,
      },
    });
    return { after: created };
  },
  async undo(step, ctx) {
    // A new post is undone by moving it to the Bin, where it can still be
    // restored for 30 days.
    const id = (step.after as Post).id;
    await callRoute(ctx.actor, one(id), postDELETE, { method: "DELETE", params: { id } });
  },
});

export const schedulePost = writeTool({
  name: "schedule_post",
  description:
    "Propose publishing an existing post, now or from a time, optionally taking it down at a time. Use find_posts for the id. Does nothing until the admin confirms.",
  schema: z.object({
    post_id: z.string().min(1),
    publish_from: z.string().optional().describe("ISO 8601 with the London offset. Omit for straight away."),
    publish_until: z.string().optional().describe("ISO 8601 with the London offset. Omit for no end."),
  }),
  async assess(args, ctx) {
    const times = resolveWindow(args.publish_from, args.publish_until, ctx.now, ctx.confirming);
    if (!times.ok) throw new AgentError(times.error);
    const post = await readPost(ctx, args.post_id);
    if (post.deleted_at) throw new AgentError(`“${post.title}” is in the Bin. Restore it in Posts first.`);
    const warnings: string[] = [];
    let destructive = false;
    if (isLive(post, ctx.now) && times.starts && Date.parse(times.starts) > ctx.now) {
      destructive = true;
      warnings.push(`“${post.title}” is live now and will be offline until ${formatLondon(times.starts)}.`);
    }
    if (post.draft) {
      warnings.push("It has unpublished edits. Those stay as a draft; the last published version is what goes live.");
    }
    return {
      risk: destructive ? "destructive" : "write",
      label: `Publish “${post.title}”`,
      detail: `At /${post.slug}, ${describeWindow(times.starts, times.ends)}`,
      warnings,
      before: post,
    };
  },
  async execute(args, ctx) {
    const times = resolveWindow(args.publish_from, args.publish_until, ctx.now, true);
    if (!times.ok) throw new AgentError(times.error);
    const updated = await callRoute<Post>(ctx.actor, one(args.post_id), postPATCH, {
      method: "PATCH",
      params: { id: args.post_id },
      body: { is_published: true, publish_from: times.starts, publish_until: times.ends },
    });
    return { after: updated };
  },
  async undo(step, ctx) {
    await restoreSchedule(step.before, step.after, ctx, String(step.args.post_id));
  },
});

export const unpublishPost = writeTool({
  name: "unpublish_post",
  description: "Propose unpublishing a post (it goes back to draft and leaves the site). Does nothing until the admin confirms.",
  schema: z.object({ post_id: z.string().min(1) }),
  async assess(args, ctx) {
    const post = await readPost(ctx, args.post_id);
    if (!post.is_published) throw new AgentError(`“${post.title}” isn't published.`);
    return {
      risk: isLive(post, ctx.now) ? "destructive" : "write",
      label: `Unpublish “${post.title}”`,
      detail: isLive(post, ctx.now)
        ? `/${post.slug} stops working straight away.`
        : `It is ${postState(post, ctx.now)}; this cancels that.`,
      warnings: [],
      before: post,
    };
  },
  async execute(args, ctx) {
    const updated = await callRoute<Post>(ctx.actor, one(args.post_id), postPATCH, {
      method: "PATCH",
      params: { id: args.post_id },
      body: { is_published: false },
    });
    return { after: updated };
  },
  async undo(step, ctx) {
    await restoreSchedule(step.before, step.after, ctx, String(step.args.post_id));
  },
});

export const binPost = writeTool({
  name: "bin_post",
  description:
    "Propose moving a post to the Bin (it leaves the site; it can be restored for 30 days). Does nothing until the admin confirms.",
  schema: z.object({ post_id: z.string().min(1) }),
  async assess(args, ctx) {
    const post = await readPost(ctx, args.post_id);
    if (post.deleted_at) throw new AgentError(`“${post.title}” is already in the Bin.`);
    return {
      risk: "destructive",
      label: `Move “${post.title}” to the Bin`,
      detail: isLive(post, ctx.now) ? `/${post.slug} stops working straight away.` : "It isn't live, so nothing visible changes.",
      warnings: ["It is deleted for good after 30 days in the Bin."],
      before: post,
    };
  },
  async execute(args, ctx) {
    await callRoute(ctx.actor, one(args.post_id), postDELETE, { method: "DELETE", params: { id: args.post_id } });
    return { after: await readPost(ctx, args.post_id) };
  },
  async undo(step, ctx) {
    const id = String(step.args.post_id);
    const current = await readPost(ctx, id);
    if (!current.deleted_at) throw new AgentError("The post is already out of the Bin.", 409);
    await callRoute(ctx.actor, one(id), postPATCH, { method: "PATCH", params: { id }, body: { restore: true } });
  },
});
