// The server side of /links and /links/<slug>: load the page, record the view,
// render it. Both route files are one line on top of this.

import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import LinkPageView from "./LinkPageView";
import { fallbackMainPage, getLinkPage } from "@/lib/linkPages/linkPages.server";
import { MAIN_SLUG, type ResolvedLinkPage } from "@/lib/linkPages/types";
import { safeMediaUrl } from "@/lib/linkPages/urls";
import { readCampaignParams, readRequestContext, recordEngagement } from "@/lib/engagement.server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SITE = "https://destinytees.uk";

/**
 * The page, once per request — generateMetadata and the page body both ask.
 * /links falls back to the six hardcoded Next Steps if the database can't
 * answer; any other slug that isn't there is a 404.
 */
const load = cache(async (slug: string): Promise<ResolvedLinkPage | null> => {
  if (slug !== MAIN_SLUG) return getLinkPage(slug);
  try {
    return (await getLinkPage(slug)) ?? fallbackMainPage();
  } catch (err) {
    console.error("⚠️ /links fell back to the hardcoded Next Steps:", err);
    return fallbackMainPage();
  }
});

export function pathFor(slug: string): string {
  return slug === MAIN_SLUG ? "/links" : `/links/${slug}`;
}

export async function linkPageMetadata(slug: string): Promise<Metadata> {
  const resolved = await load(slug).catch(() => null);
  if (!resolved) return { title: "Not found" };
  const { page } = resolved;

  const title = page.seo_title || page.title || "Links";
  const description =
    page.seo_description || page.bio || "Links from Destiny Church Tees Valley.";
  const path = pathFor(slug);
  const image = safeMediaUrl(page.og_image_url) || safeMediaUrl(page.avatar_url);

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: page.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${title} | Destiny Church Tees Valley`,
      description,
      url: `${SITE}${path}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function LinkPageRoute({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: SearchParams;
}) {
  const resolved = await load(slug);
  if (!resolved) notFound();

  // A page view, for the editor's Analytics tab: views vs. clicks is the
  // click-through rate. Recorded here rather than by a browser beacon so it
  // can't be inflated with curl beyond actually requesting the page, and so
  // the ?s=qr / ?s=nfc tag on the printed code is captured. Headers are read
  // now — after() callbacks in a Server Component can't call headers().
  if (resolved.page.id !== "fallback") {
    const ctx = readRequestContext(await headers());
    const campaign = readCampaignParams(await searchParams);
    const { id } = resolved.page;
    after(() =>
      recordEngagement({
        source: "links_view",
        targetKey: id,
        targetLabel: pathFor(slug),
        ...ctx,
        ...campaign,
      }),
    );
  }

  return <LinkPageView page={resolved.page} theme={resolved.theme} blocks={resolved.blocks} />;
}
