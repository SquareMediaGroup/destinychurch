import Link from "next/link";

export default function WorshipWithUsSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#2c1a0e] to-[#3d2b1a]">
      {/* Background image overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url(/img/photos/worship-bg.jpg)" }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-16 md:flex-row md:items-center lg:px-8">
        <div className="max-w-xl">
          <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">
            Worship With Us
          </h2>
          <p className="text-base leading-relaxed text-white/70">
            Church is a place to belong, not an event to attend. As a community,
            together, we can be more and do more as we press on to be all God
            wants us to be. Come and experience an awesome time of praise,
            worship, teaching and friendship.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/new-here"
            className="rounded-full bg-destiny-orange px-8 py-3 text-center text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
          >
            Plan Your Visit
          </Link>
          <Link
            href="/sermons"
            className="rounded-full border-2 border-white/30 px-8 py-3 text-center text-sm font-bold text-white backdrop-blur transition hover:border-white/60 hover:bg-white/10"
          >
            Watch Church Online
          </Link>
        </div>
      </div>
    </section>
  );
}
