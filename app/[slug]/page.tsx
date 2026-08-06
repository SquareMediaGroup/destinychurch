import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/utils/supabase/service";
import { getPublishedPostBySlug } from "@/lib/posts.server";
import { EventsRail, CoursesRail } from "@/components/posts/PostRails";
import RichContent from "@/components/content/RichContent";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const post = await getPublishedPostBySlug(slug);
  if (post) return { title: post.title };
  return {};
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;

  // 1. An admin-authored Post published at this slug.
  const post = await getPublishedPostBySlug(slug);
  if (post) {
    return (
      <article className="bg-white pb-24">
        {/*
          Below 1600px this is the same single centred column it has always been.
          At 1600px+ it becomes a three-track grid so the promo rails can sit in
          the margins — the article track stays pinned at 768px, so the reading
          width never changes. See components/posts/PostRails.tsx.

          Widths: 300 + 64 gutter + 768 + 64 gutter + 300 = 1496 of content,
          + 64 of lg:px-8 = the 1560px cap. Every pixel of gutter costs two, so
          changing gap-16 means recomputing max-w and the breakpoint together.
        */}
        <div className="mx-auto grid w-full max-w-3xl px-4 pt-12 lg:px-8 min-[1600px]:max-w-[1560px] min-[1600px]:grid-cols-[300px_minmax(0,768px)_300px] min-[1600px]:gap-16">
          {/* Article stays first in the DOM so promo never precedes the content. */}
          <div className="min-w-0 min-[1440px]:col-start-2 min-[1440px]:row-start-1">
            <h1 className="text-3xl font-black text-destiny-grey md:text-4xl">
              {post.title}
            </h1>
            <RichContent
              html={post.body}
              className="rte-content mt-8 text-[0.97rem] text-destiny-grey/80"
            />
          </div>

          {/* Streamed so a slow ChurchSuite feed can't hold up the post body. */}
          <Suspense fallback={null}>
            <EventsRail />
          </Suspense>
          <CoursesRail />
        </div>
      </article>
    );
  }

  // 2. A managed redirect.
  const supabase = createServiceClient();
  const { data: redirectRow } = await supabase
    .from("redirects")
    .select("target_url")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (redirectRow) redirect(redirectRow.target_url);
  notFound();
}
