import AnimateIn from "@/components/AnimateIn";

export default function MediaHero() {
  return (
    <section className="bg-white pt-20 pb-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Photos
          </p>
          <h1 className="mb-5 text-4xl font-black text-destiny-grey md:text-5xl">
            Moments from Destiny
          </h1>
          <p className="text-base leading-relaxed text-destiny-grey/60">
            Browse photos from services and events, and share your own — every
            board below is open to add to, and every photo you upload appears
            once our Media Team has had a look.
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}
