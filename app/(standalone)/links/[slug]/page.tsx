// /links/<slug> — any other links page built in /admin/links (a youth page,
// a course page, a conference). Unpublished or unknown slugs are a 404.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LinkPageRoute, { linkPageMetadata } from "@/components/links/LinkPageRoute";
import { MAIN_SLUG, SLUG_RE } from "@/lib/linkPages/types";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_RE.test(slug) || slug === MAIN_SLUG) return { title: "Not found" };
  return linkPageMetadata(slug);
}

export default async function LinksSlugPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  // /links/main would duplicate /links; everything malformed is a 404 before
  // it costs a query.
  if (!SLUG_RE.test(slug) || slug === MAIN_SLUG) notFound();
  return <LinkPageRoute slug={slug} searchParams={searchParams} />;
}
