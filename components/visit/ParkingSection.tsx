"use client";

import AnimateIn from "@/components/AnimateIn";

export default function ParkingSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Parking Information
            </p>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">
              Free Parking Available
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              We have plenty of free parking on-site. Here&apos;s what you need to know.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-6 md:grid-cols-3">
          <AnimateIn delay={100}>
            <div className="rounded-3xl bg-[#f5f7fa] p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10">
                <span className="material-symbols-rounded text-4xl text-destiny-orange">local_parking</span>
              </div>
              <h3 className="mb-2 text-lg font-black text-destiny-grey">Free Parking</h3>
              <p className="text-sm leading-relaxed text-destiny-grey/60">
                Ample free parking spaces available for all visitors and members.
              </p>
            </div>
          </AnimateIn>

          <AnimateIn delay={180}>
            <div className="rounded-3xl bg-[#f5f7fa] p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10">
                <span className="material-symbols-rounded text-4xl text-destiny-orange">accessible</span>
              </div>
              <h3 className="mb-2 text-lg font-black text-destiny-grey">Accessible Spaces</h3>
              <p className="text-sm leading-relaxed text-destiny-grey/60">
                Designated accessible parking bays close to the entrance.
              </p>
            </div>
          </AnimateIn>

          <AnimateIn delay={260}>
            <div className="rounded-3xl bg-[#f5f7fa] p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10">
                <span className="material-symbols-rounded text-4xl text-destiny-orange">family_restroom</span>
              </div>
              <h3 className="mb-2 text-lg font-black text-destiny-grey">Family Friendly</h3>
              <p className="text-sm leading-relaxed text-destiny-grey/60">
                Parent and child spaces available near the main entrance.
              </p>
            </div>
          </AnimateIn>
        </div>

        <AnimateIn delay={340}>
          <div className="mt-10 rounded-3xl border-2 border-destiny-orange/20 bg-destiny-orange/5 p-6 text-center">
            <p className="text-sm font-bold text-destiny-grey">
              <span className="material-symbols-rounded mr-2 inline-block align-middle text-destiny-orange">info</span>
              Arrive early on your first visit to find parking easily and get settled before the service starts.
            </p>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
