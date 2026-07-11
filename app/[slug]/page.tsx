import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/utils/supabase/service";
import { getPublishedPostBySlug } from "@/lib/posts.server";

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
        <div className="mx-auto max-w-3xl px-4 pt-12 lg:px-8">
          <h1 className="text-3xl font-black text-destiny-grey md:text-4xl">
            {post.title}
          </h1>
          {post.body ? (
            <div
              className="rte-content mt-8 text-[0.97rem] text-destiny-grey/80"
              dangerouslySetInnerHTML={{ __html: post.body }}
            />
          ) : null}
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
