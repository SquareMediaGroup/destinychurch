import type { Metadata } from "next";
import { Suspense } from "react";
import { after } from "next/server";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import PageUnavailable from "@/components/PageUnavailable";
import { getOutageState } from "@/lib/outage";
import { createServiceClient } from "@/utils/supabase/service";
import { getPostForView } from "@/lib/posts.server";
import { EventsRail, CoursesRail } from "@/components/posts/PostRails";
import { PostHero, PostPlainTitle } from "@/components/posts/PostHero";
import RichContent from "@/components/content/RichContent";
import { hasWideBlocks } from "@/components/blocks/size";
import { readCampaignParams, readRequestContext, recordEngagement } from "@/lib/engagement.server";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

function previewParam(sp: Record<string, string | string[] | undefined>): string | undefined {
  return typeof sp.preview === "string" ? sp.preview : undefined;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;

  const found = await getPostForView(slug, previewParam(await searchParams));
  if (!found) return {};
  const { post, preview } = found;
  const image = post.og_image_url || post.hero_image_url;
  return {
    title: post.title,
    description: post.description ?? undefined,
    openGraph: {
      title: post.title,
      description: post.description ?? undefined,
      images: image ? [image] : undefined,
    },
    // A preview link must never end up in a search index, and nor must a page
    // the admin asked to keep out of search (a QR-only page).
    robots: preview || post.hide_from_search ? { index: false, follow: false } : undefined,
  };
}

export default async function SlugPage({ params, searchParams }: Props) {
  const { slug } = await params;

  // 1. An admin-authored Post published at this slug — or a draft, when the
  //    request carries a valid signed preview token for it.
  const found = await getPostForView(slug, previewParam(await searchParams));
  if (found) {
    const { post, preview } = found;
    // Count the view for the admin list's "Views" column. Previews are the
    // editor checking their own work, so they aren't counted. Read the request
    // now: after() callbacks can't call headers() — see readRequestContext().
    if (!preview) {
      const ctx = readRequestContext(await headers());
      const campaign = readCampaignParams(await searchParams);
      after(() =>
        recordEngagement({
          source: "post_view",
          targetKey: post.id,
          targetLabel: `/${post.slug}`,
          ...ctx,
          ...campaign,
        }),
      );
    }
    const plain = post.hero_style === "plain" || (post.hero_style === "image" && !post.hero_image_url);
    // Wide and full-width blocks need the article centred, so a page with any
    // drops the promo rails (components/blocks/size.ts).
    const wide = hasWideBlocks(post.body);
    const showRails = post.show_rails && !wide;
    return (
      <article className={`bg-white pb-24 ${wide ? "overflow-x-clip" : ""}`}>
        {preview && (
          <div className="sticky top-0 z-40 bg-destiny-grey px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-white">
            {post.is_published ? "Preview: these changes aren't live yet" : "Preview: this page is not published"}
          </div>
        )}
        <PostHero post={post} />
        {/*
          Below 1600px this is the same single centred column it has always been.
          At 1600px+ it becomes a three-track grid so the promo rails can sit in
          the margins — the article track stays pinned at 768px, so the reading
          width never changes. See components/posts/PostRails.tsx. With the
          rails switched off for this post, it stays the single column.

          Widths: 300 + 64 gutter + 768 + 64 gutter + 300 = 1496 of content,
          + 64 of lg:px-8 = the 1560px cap. Every pixel of gutter costs two, so
          changing gap-16 means recomputing max-w and the breakpoint together.
        */}
        <div
          className={`mx-auto grid w-full max-w-3xl px-4 pt-12 lg:px-8 ${
            showRails
              ? "min-[1600px]:max-w-[1560px] min-[1600px]:grid-cols-[300px_minmax(0,768px)_300px] min-[1600px]:gap-16"
              : ""
          }`}
        >
          {/* Article stays first in the DOM so promo never precedes the content. */}
          <div
            className={`min-w-0 ${showRails ? "min-[1440px]:col-start-2 min-[1440px]:row-start-1" : ""}`}
          >
            {plain && <PostPlainTitle post={post} />}
            <RichContent
              html={post.body}
              allowWide
              className={`rte-content text-[0.97rem] text-destiny-grey/80 ${plain ? "mt-8" : ""}`}
            />
          </div>

          {showRails && (
            <>
              {/* Streamed so a slow ChurchSuite feed can't hold up the post body. */}
              <Suspense fallback={null}>
                <EventsRail />
              </Suspense>
              <CoursesRail />
            </>
          )}
        </div>
      </article>
    );
  }

  // 2. A managed redirect.
  const supabase = createServiceClient();
  const { data: redirectRow } = await supabase
    .from("redirects")
    // Widened from target_url alone: id/label carry into the click log so a
    // renamed or deleted redirect keeps the name it had when it was used.
    .select("id, slug, label, target_url")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (redirectRow) {
    // Read the request now, while still inside render — after() callbacks in a
    // Server Component may not call headers(), so the values are captured here
    // and closed over. See the comment on readRequestContext().
    const ctx = readRequestContext(await headers());
    const campaign = readCampaignParams(await searchParams);

    // Registered before redirect(), which throws. after() runs regardless —
    // "even if the response didn't complete successfully, including when
    // notFound or redirect is called" — and on Vercel it's backed by
    // waitUntil, so this write happens after the 307 is already on its way.
    after(() =>
      recordEngagement({
        source: "redirect",
        targetKey: redirectRow.slug,
        targetLabel: redirectRow.label,
        redirectId: redirectRow.id,
        ...ctx,
        ...campaign,
      }),
    );

    redirect(redirectRow.target_url);
  }
  // Nothing matched — but during an outage that says nothing about whether
  // the page exists.
  if (getOutageState().data) return <PageUnavailable />;
  notFound();
}
