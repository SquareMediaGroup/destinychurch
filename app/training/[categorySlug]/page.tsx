import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimateIn from "@/components/AnimateIn";
import {
  getCategoryBySlug,
  getSubgroupsForCategory,
  getSubgroupStats,
} from "@/lib/training.server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return { title: "Training" };

  const description =
    category.description ||
    `${category.name} training resources for serving teams at Destiny Church Tees Valley.`;

  return {
    title: `${category.name} Training`,
    description,
    alternates: { canonical: `/training/${category.slug}` },
    openGraph: {
      title: `${category.name} Training | Destiny Church Tees Valley`,
      description,
      url: `/training/${category.slug}`,
      type: "website",
    },
  };
}

export default async function TrainingCategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  const subgroups = await getSubgroupsForCategory(category.id);
  const subgroupStats = await getSubgroupStats(subgroups.map((s) => s.id));

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
              href="/training"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/60 transition hover:text-white"
            >
              <span className="material-symbols-rounded text-base">arrow_back</span>
              All training
            </Link>
            <h1 className="mt-4 text-4xl font-black text-white md:text-5xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-3 max-w-xl text-base text-white/65">
                {category.description}
              </p>
            )}
          </AnimateIn>
        </section>
      </div>

      <section className="bg-white pb-24 pt-8">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          {subgroups.length === 0 ? (
            <p className="py-16 text-center text-destiny-grey/55">
              No groups in this category yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subgroups.map((sub) => (
                <AnimateIn key={sub.id}>
                  <Link
                    href={`/training/${category.slug}/${sub.slug}`}
                    className="group flex h-full flex-col rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
                  >
                    <h3 className="text-base font-bold text-destiny-grey">
                      {sub.name}
                    </h3>
                    {sub.description && (
                      <p className="mt-1 flex-1 text-sm leading-snug text-destiny-grey/50">
                        {sub.description}
                      </p>
                    )}
                    <div className="mt-4 space-y-1.5">
                      {(() => {
                        const stats = subgroupStats.get(sub.id);
                        const count = stats?.postCount ?? 0;
                        const mins = stats?.totalReadMinutes ?? 0;
                        return count > 0 ? (
                          <p className="text-[11px] font-bold uppercase tracking-wider text-destiny-grey/40">
                            {count} {count === 1 ? "lesson" : "lessons"}
                            {mins > 0 && <> · ~{mins} min</>}
                          </p>
                        ) : null;
                      })()}
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/40">
                        {sub.has_password ? (
                          <>
                            <span className="material-symbols-rounded text-sm">
                              lock
                            </span>
                            Password protected
                          </>
                        ) : (
                          <span className="text-destiny-orange">Open access</span>
                        )}
                        <span className="material-symbols-rounded ml-auto text-base text-destiny-orange transition group-hover:translate-x-0.5">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                  </Link>
                </AnimateIn>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
