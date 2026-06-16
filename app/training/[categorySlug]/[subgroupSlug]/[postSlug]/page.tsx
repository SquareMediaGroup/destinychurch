import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimateIn from "@/components/AnimateIn";
import PasswordGate from "@/components/training/PasswordGate";
import CompleteButton from "@/components/training/CompleteButton";
import { getPostBySlugs, getPublishedPosts } from "@/lib/training.server";
import { isUnlocked } from "@/lib/trainingAccess";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    categorySlug: string;
    subgroupSlug: string;
    postSlug: string;
  }>;
}): Promise<Metadata> {
  const { categorySlug, subgroupSlug, postSlug } = await params;
  const found = await getPostBySlugs(categorySlug, subgroupSlug, postSlug);
  return {
    title: found ? `${found.post.title} | Training` : "Training",
    robots: { index: false, follow: false },
  };
}

export default async function TrainingPostPage({
  params,
}: {
  params: Promise<{
    categorySlug: string;
    subgroupSlug: string;
    postSlug: string;
  }>;
}) {
  const { categorySlug, subgroupSlug, postSlug } = await params;
  const found = await getPostBySlugs(categorySlug, subgroupSlug, postSlug);
  if (!found) notFound();

  const { category, subgroup, post } = found;

  // Same gate as the sub-group page — a post is only readable once unlocked.
  if (subgroup.has_password && !(await isUnlocked(subgroup.id))) {
    return (
      <PasswordGate
        subgroupId={subgroup.id}
        categoryName={category.name}
        subgroupName={subgroup.name}
      />
    );
  }

  // Adjacent lessons in the same sub-group, by display order, for the pager.
  const siblings = await getPublishedPosts(subgroup.id);
  const index = siblings.findIndex((p) => p.id === post.id);
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  const base = `/training/${category.slug}/${subgroup.slug}`;

  return (
    <article className="bg-white pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-10 lg:px-8">
        <AnimateIn>
          <Link
            href={`/training/${category.slug}/${subgroup.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-destiny-grey/45 transition hover:text-destiny-orange"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            {subgroup.name}
          </Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-destiny-orange">
            {category.name} · {subgroup.name}
          </p>
          <h1 className="mt-2 text-3xl font-black text-destiny-grey md:text-4xl">
            {post.title}
          </h1>
          {post.summary && (
            <p className="mt-3 text-base text-destiny-grey/60">{post.summary}</p>
          )}
        </AnimateIn>

        <AnimateIn className="mt-8">
          {post.body ? (
            <div
              className="rte-content text-[0.97rem] text-destiny-grey/80"
              dangerouslySetInnerHTML={{ __html: post.body }}
            />
          ) : (
            <p className="text-sm text-destiny-grey/55">
              This post doesn&apos;t have any content yet.
            </p>
          )}

          <CompleteButton postId={post.id} />

          <nav className="mt-8 grid grid-cols-2 gap-3">
            {prev ? (
              <Link
                href={`${base}/${prev.slug}`}
                className="group flex flex-col rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
              >
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/40">
                  <span className="material-symbols-rounded text-sm">arrow_back</span>
                  Previous
                </span>
                <span className="mt-1 line-clamp-1 text-sm font-bold text-destiny-grey transition group-hover:text-destiny-orange">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}

            {next ? (
              <Link
                href={`${base}/${next.slug}`}
                className="group flex flex-col items-end rounded-2xl border border-black/5 bg-white p-4 text-right shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
              >
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/40">
                  Next
                  <span className="material-symbols-rounded text-sm">arrow_forward</span>
                </span>
                <span className="mt-1 line-clamp-1 text-sm font-bold text-destiny-grey transition group-hover:text-destiny-orange">
                  {next.title}
                </span>
              </Link>
            ) : (
              <Link
                href={base}
                className="group flex flex-col items-end rounded-2xl border border-black/5 bg-white p-4 text-right shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
              >
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/40">
                  Finish
                  <span className="material-symbols-rounded text-sm">done_all</span>
                </span>
                <span className="mt-1 line-clamp-1 text-sm font-bold text-destiny-grey transition group-hover:text-destiny-orange">
                  Back to {subgroup.name}
                </span>
              </Link>
            )}
          </nav>
        </AnimateIn>
      </div>
    </article>
  );
}
