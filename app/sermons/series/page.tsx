import type { Metadata } from "next";
import { Suspense } from "react";
import CollectionSection from "@/components/sermons/CollectionSection";

export const metadata: Metadata = {
  title: "Series",
  description: "Watch sermon series from Destiny Church Tees Valley.",
  alternates: { canonical: "/sermons/series" },
  openGraph: {
    title: "Series | Destiny Church Tees Valley",
    description: "Watch sermon series from Destiny Church Tees Valley.",
    url: "https://destinytees.uk/sermons/series",
  },
};

export const revalidate = 3600;

export default function SeriesPage() {
  return (
    <>
      <div
        className="relative overflow-hidden py-28 text-center"
        style={{ background: "linear-gradient(135deg, #1a1108 0%, #0d0d0d 100%)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        <div className="relative mx-auto max-w-3xl px-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Destiny Church
          </p>
          <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">
            Series
          </h1>
          <p className="text-base text-white/60 md:text-lg">
            Dive deep into themed sermon series.
          </p>
        </div>
      </div>

      <section className="bg-[#111111] py-14">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Suspense fallback={<p className="text-center text-sm text-white/40">Loading series...</p>}>
            <CollectionSection type="series" />
          </Suspense>
        </div>
      </section>
    </>
  );
}
