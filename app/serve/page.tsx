import type { Metadata } from "next";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import MinistriesGrid from "@/components/serve/MinistriesGrid";

export const metadata: Metadata = {
  title: "Serve",
  description: "Join a ministry team at Destiny Church Tees Valley. From worship and kids to production and outreach — find your place and use your gifts to serve others.",
  alternates: { canonical: "/serve" },
  openGraph: {
    title: "Serve | Destiny Church Tees Valley",
    description: "You were made for more than just attending. Find your team and use your gifts at Destiny Church.",
    url: "https://destinytees.uk/serve",
  },
};

export default function ServePage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/Training_DC-scaled.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Get Involved</p>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">Serve</h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">
                You were made for more than just attending. Find your place on the team.
              </p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Scripture */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <AnimateIn>
            <blockquote className="text-xl font-medium italic leading-relaxed text-destiny-grey md:text-2xl">
              &ldquo;For we are God&apos;s handiwork, created in Christ Jesus to do good works,
              which God prepared in advance for us to do.&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-bold text-destiny-orange">Ephesians 2:10</p>
          </AnimateIn>
        </div>
      </section>

      {/* Why serve */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Why Serve?</p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
                You have something to offer
              </h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Serving isn&apos;t just about filling a rota — it&apos;s one of the most powerful ways to grow in your own faith. When you use your gifts to serve others, you step into the purpose God has placed in you.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                Whether you love music, working with children, tech, admin or just making people feel welcome — there is a team at Destiny where you belong and where your contribution genuinely matters.
              </p>
            </AnimateIn>
            <AnimateIn delay={100} className="grid w-full grid-cols-2 gap-3 md:w-1/2">
              <div className="col-span-2 overflow-hidden rounded-3xl">
                <Image src="/img/photos/Training_DC-scaled.jpg" alt="Serving at Destiny" width={640} height={280} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Gallery/SN1_7825.CR2.jpeg" alt="" width={300} height={200} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Gallery/SN1_7832.CR2.jpeg" alt="" width={300} height={200} className="w-full object-cover" />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Ministries */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">Our Ministries</h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">Tap a card to find out more</p>
          </AnimateIn>
          <MinistriesGrid />
        </div>
      </section>

      {/* Sign up form */}
      <section id="get-involved" style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-20">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-destiny-orange">Ready to Join a Team?</p>
            <h2 className="mb-3 text-center text-3xl font-black text-white md:text-4xl">Get Involved</h2>
            <p className="mb-10 text-center text-base text-white/60">
              Fill in the form below and we&apos;ll be in touch to find the best fit for you.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <div className="overflow-hidden rounded-3xl shadow-2xl">
              <iframe
                src="https://destinytees.churchsuite.com/-/forms/cdgkeqkm"
                className="w-full"
                style={{ height: 800, border: "none" }}
                title="Serve sign up form"
                loading="lazy"
              />
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Photo strip */}
      <section className="bg-[#f5f7fa] py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              "/img/photos/Gallery/SN1_7835.CR2.jpeg",
              "/img/photos/Gallery/SN1_7862.CR2.jpeg",
              "/img/photos/Gallery/SN1_7865.CR2.jpeg",
              "/img/photos/Gallery/SN1_7875.CR2.jpeg",
            ].map((src, i) => (
              <AnimateIn key={i} delay={i * 60}>
                <div className="aspect-square overflow-hidden rounded-2xl">
                  <Image src={src} alt="" width={300} height={300} className="h-full w-full object-cover" />
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
