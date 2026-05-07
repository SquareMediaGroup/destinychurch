"use client";

import AnimateIn from "@/components/AnimateIn";

export default function ServiceTimesSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Join Us
            </p>
            <h2 className="mb-4 text-4xl font-black text-destiny-grey md:text-5xl">
              Sunday Service Times
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              We gather every Sunday to worship together, hear from God&apos;s Word, and connect as a church family.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-6 md:grid-cols-2">
          <AnimateIn delay={100}>
            <div className="rounded-3xl bg-gradient-to-br from-destiny-orange to-destiny-orange/80 p-8 text-white shadow-lg">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                <span className="material-symbols-rounded text-4xl">schedule</span>
              </div>
              <h3 className="mb-2 text-2xl font-black">Morning Service</h3>
              <p className="mb-6 text-white/80">
                Our main Sunday gathering with worship, teaching, and community.
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black">10:30</span>
                <span className="text-xl font-bold uppercase tracking-wide">AM</span>
              </div>
            </div>
          </AnimateIn>

          <AnimateIn delay={200}>
            <div className="rounded-3xl bg-[#f5f7fa] p-8">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10">
                <span className="material-symbols-rounded text-4xl text-destiny-orange">coffee</span>
              </div>
              <h3 className="mb-2 text-2xl font-black text-destiny-grey">Before & After</h3>
              <p className="mb-6 text-destiny-grey/60">
                Arrive early for coffee and stay after to connect with others.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-destiny-grey/70">
                  <span className="material-symbols-rounded text-base text-destiny-orange">check_circle</span>
                  Doors open at 10:00 AM
                </li>
                <li className="flex items-center gap-3 text-sm text-destiny-grey/70">
                  <span className="material-symbols-rounded text-base text-destiny-orange">check_circle</span>
                  Service ends around 12:00 PM
                </li>
                <li className="flex items-center gap-3 text-sm text-destiny-grey/70">
                  <span className="material-symbols-rounded text-base text-destiny-orange">check_circle</span>
                  Stay for refreshments
                </li>
              </ul>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
