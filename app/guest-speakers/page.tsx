import type { Metadata } from "next";
import { Suspense } from "react";
import CollectionSection from "@/components/sermons/CollectionSection";

export const metadata: Metadata = {
  title: "Guest Speakers",
  description: "Watch sermons from guest speakers at Destiny Church Tees Valley.",
  alternates: { canonical: "/guest-speakers" },
  openGraph: {
    title: "Guest Speakers | Destiny Church Tees Valley",
    description: "Watch sermons from guest speakers at Destiny Church Tees Valley.",
    url: "https://destinytees.uk/guest-speakers",
  },
};

export const revalidate = 3600;

export default function GuestSpeakersPage() {
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
            Guest Speakers
          </h1>
          <p className="text-base text-white/60 md:text-lg">
            Powerful messages from visiting ministers.
          </p>
        </div>
      </div>

      <section className="bg-[#111111] py-14">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Suspense fallback={<p className="text-center text-sm text-white/40">Loading speakers...</p>}>
            <CollectionSection type="guest_speaker" />
          </Suspense>
        </div>
      </section>
    </>
  );
}
