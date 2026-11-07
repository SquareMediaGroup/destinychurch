import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { extractPostLinks, isPrivateHost } from "@/lib/postLinks";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { postState, SITE_ORIGIN } from "@/lib/posts";

// audit-exempt: read-only — checks the links in a body the editor sends and
// reports which are broken. Nothing is stored.

export const maxDuration = 30;

const MAX_LINKS = 25;
const TIMEOUT_MS = 6000;

type Result = { href: string; where: string; problem: string | null };

/**
 * Follows redirects by hand (up to 4 hops) so every hop's host is checked
 * against isPrivateHost — `redirect: "follow"` would let a public URL bounce
 * the request somewhere internal.
 */
async function statusOf(start: URL, method: "HEAD" | "GET"): Promise<number | "private"> {
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    if (isPrivateHost(url.hostname)) return "private";
    const res = await fetch(url, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "DestinyChurchLinkCheck/1.0 (+https://destinytees.uk)" },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    return res.status;
  }
  return 508; // too many redirects
}

async function checkExternal(url: URL): Promise<string | null> {
  try {
    let status = await statusOf(url, "HEAD");
    // Plenty of sites refuse HEAD; ask again properly before calling it broken.
    if (status === 405 || status === 403 || status === 501) status = await statusOf(url, "GET");
    if (status === "private") return "This address can't be checked.";
    if (status === 404 || status === 410) return "The page isn't there (it may have moved or closed).";
    if (status === 508) return "The link redirects too many times.";
    if (status >= 500) return `The site returned an error (${status}).`;
    return null;
  } catch {
    return "The site didn't respond.";
  }
}

/**
 * Checks every link in a post body. Internal links are checked against the
 * site itself (Posts, redirects and real pages); external ones get a HEAD (or
 * GET) with a short timeout. Problems only, so a "nothing wrong" answer is an
 * empty list.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const links = extractPostLinks(typeof body.body === "string" ? body.body : "").slice(0, MAX_LINKS);
  const supabase = createServiceClient();

  const results: Result[] = await Promise.all(
    links.map(async ({ href, where }): Promise<Result> => {
      if (/^(mailto|tel):/i.test(href) || href.startsWith("#")) return { href, where, problem: null };
      let url: URL;
      try {
        url = new URL(href, SITE_ORIGIN);
      } catch {
        return { href, where, problem: "This isn't a valid link." };
      }
      if (!/^https?:$/.test(url.protocol)) return { href, where, problem: "Links must start with https://." };

      const internal = url.hostname === "destinytees.uk" || url.hostname === "www.destinytees.uk";
      if (!internal) return { href, where, problem: await checkExternal(url) };

      const first = url.pathname.split("/").filter(Boolean)[0];
      if (!first || isReservedSlug(first)) return { href, where, problem: null };
      const [{ data: post }, { data: redirect }] = await Promise.all([
        supabase
          .from("posts")
          .select("is_published, publish_from, publish_until, deleted_at")
          .eq("slug", first)
          .maybeSingle(),
        supabase.from("redirects").select("id").eq("slug", first).eq("active", true).maybeSingle(),
      ]);
      if (post && !post.deleted_at) {
        const state = postState(post);
        if (state === "live") return { href, where, problem: null };
        return {
          href,
          where,
          problem:
            state === "draft"
              ? "Goes to a post that isn't published."
              : state === "scheduled"
                ? "Goes to a post that isn't live yet."
                : "Goes to a post that has ended.",
        };
      }
      if (redirect) return { href, where, problem: null };
      return { href, where, problem: "No page on the site has this address." };
    }),
  );

  return NextResponse.json({
    checked: links.length,
    problems: results.filter((r) => r.problem),
    truncated: extractPostLinks(body.body).length > MAX_LINKS,
  });
}
