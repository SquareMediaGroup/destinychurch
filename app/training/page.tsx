import type { Metadata } from "next";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import { getTrainingTree } from "@/lib/training.server";

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Training resources for our serving teams at Destiny Church Tees Valley — production, stewarding, hospitality, kids and more.";

export const metadata: Metadata = {
  title: "Training",
  description: DESCRIPTION,
  alternates: { canonical: "/training" },
  openGraph: {
    title: "Training | Destiny Church Tees Valley",
    description: DESCRIPTION,
    url: "/training",
    type: "website",
  },
};

export default async function TrainingPage() {
  const categories = await getTrainingTree();

  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl px-6 py-20 md:py-24"
          style={{ background: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 100%)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
          <AnimateIn className="relative z-10 mx-auto max-w-4xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              For our serving teams
            </p>
            <h1 className="text-5xl font-black text-white md:text-6xl">
              Training
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/65 md:text-lg">
              Everything you need to serve with confidence. Choose your team
              below — some areas are password protected for those who serve on
              them.
            </p>
          </AnimateIn>
        </section>
      </div>

      {/* Categories */}
      <section className="bg-white pb-24 pt-8">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          {categories.length === 0 ? (
            <p className="py-16 text-center text-destiny-grey/55">
              Training content is coming soon.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <AnimateIn key={category.id}>
                  <Link
                    href={`/training/${category.slug}`}
                    className="group flex h-full flex-col rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
                  >
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10 text-destiny-orange">
                      <span className="material-symbols-rounded text-[26px]">
                        {category.icon || "school"}
                      </span>
                    </span>
                    <h2 className="text-lg font-black text-destiny-grey">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="mt-1 flex-1 text-sm leading-snug text-destiny-grey/55">
                        {category.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/40">
                      {category.subgroups.length}{" "}
                      {category.subgroups.length === 1 ? "group" : "groups"}
                      <span className="material-symbols-rounded ml-auto text-base text-destiny-orange transition group-hover:translate-x-0.5">
                        arrow_forward
                      </span>
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
