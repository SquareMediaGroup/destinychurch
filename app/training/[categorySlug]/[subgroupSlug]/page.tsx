import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimateIn from "@/components/AnimateIn";
import PasswordGate from "@/components/training/PasswordGate";
import TrainingProgress from "@/components/training/TrainingProgress";
import CompletablePostList from "@/components/training/CompletablePostList";
import { getSubgroupBySlugs, getPublishedPosts } from "@/lib/training.server";
import { isUnlocked } from "@/lib/trainingAccess";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; subgroupSlug: string }>;
}): Promise<Metadata> {
  const { categorySlug, subgroupSlug } = await params;
  const found = await getSubgroupBySlugs(categorySlug, subgroupSlug);
  return {
    title: found
      ? `${found.subgroup.name} | ${found.category.name} Training`
      : "Training",
    robots: { index: false, follow: false },
  };
}

export default async function TrainingSubgroupPage({
  params,
}: {
  params: Promise<{ categorySlug: string; subgroupSlug: string }>;
}) {
  const { categorySlug, subgroupSlug } = await params;
  const found = await getSubgroupBySlugs(categorySlug, subgroupSlug);
  if (!found) notFound();

  const { category, subgroup } = found;

  // Gate: a password-protected group needs a valid unlock cookie.
  if (subgroup.has_password && !(await isUnlocked(subgroup.id))) {
    return (
      <PasswordGate
        subgroupId={subgroup.id}
        categoryName={category.name}
        subgroupName={subgroup.name}
      />
    );
  }

  const posts = await getPublishedPosts(subgroup.id);

  return (
    <>
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl px-6 py-16 md:py-20"
          style={{ background: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 100%)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
          <AnimateIn className="relative z-10 mx-auto max-w-4xl">
            <Link
              href={`/training/${category.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/60 transition hover:text-white"
            >
              <span className="material-symbols-rounded text-base">arrow_back</span>
              {category.name}
            </Link>
            <h1 className="mt-4 text-4xl font-black text-white md:text-5xl">
              {subgroup.name}
            </h1>
            {subgroup.description && (
              <p className="mt-3 max-w-xl text-base text-white/65">
                {subgroup.description}
              </p>
            )}
            <TrainingProgress postIds={posts.map((p) => p.id)} />
          </AnimateIn>
        </section>
      </div>

      <section className="bg-white pb-24 pt-8">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          {posts.length === 0 ? (
            <p className="py-16 text-center text-destiny-grey/55">
              No training posts here yet — check back soon.
            </p>
          ) : (
            <CompletablePostList
              posts={posts}
              basePath={`/training/${category.slug}/${subgroup.slug}`}
            />
          )}
        </div>
      </section>
    </>
  );
}
