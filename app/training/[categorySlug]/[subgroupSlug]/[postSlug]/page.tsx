import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimateIn from "@/components/AnimateIn";
import PasswordGate from "@/components/training/PasswordGate";
import { getPostBySlugs } from "@/lib/training.server";
import { isUnlocked } from "@/lib/trainingAccess";

export const dynamic = "force-dynamic";

const DISPLAY = { fontFamily: "var(--font-anton), Impact, sans-serif" } as const;

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
          <h1
            className="mt-2 text-3xl uppercase leading-[1.02] text-destiny-grey md:text-4xl"
            style={DISPLAY}
          >
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
        </AnimateIn>
      </div>
    </article>
  );
}
